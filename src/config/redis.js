import Redis from "ioredis";
import config from "./index.js";
import logger from "../utils/logger.js";

const REDIS_OPTIONS = {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  lazyConnect: true,
  connectTimeout: config.redisConnectTimeoutMs,
};

let redisClient = null;
let redisReady = false;
let redisInitialized = false;
let degradedModeActive = false;

const markDegradedModeActive = (reason) => {
  if (degradedModeActive) {
    return;
  }

  degradedModeActive = true;
  logger.warn("Redis degraded mode active. Falling back to in-memory behavior.", {
    reason,
  });
};

const markDegradedModeRecovered = () => {
  if (!degradedModeActive) {
    return;
  }

  degradedModeActive = false;
  logger.info("Redis connectivity restored. Exiting degraded mode.");
};

export const createRedisConnection = () => {
  return new Redis(config.redisUrl, {
    ...REDIS_OPTIONS,
    lazyConnect: false,
  });
};

export const initRedis = async () => {
  if (redisInitialized) {
    return {
      available: redisReady,
    };
  }

  redisInitialized = true;

  if (config.redisDegradedMode) {
    logger.info("Redis degraded mode fallback is enabled.");
  }

  try {
    redisClient = new Redis(config.redisUrl, REDIS_OPTIONS);

    redisClient.on("ready", () => {
      redisReady = true;
      markDegradedModeRecovered();
    });

    redisClient.on("error", (error) => {
      redisReady = false;
      logger.error("Redis client error", {
        errorMessage: error.message,
      });

      if (config.redisDegradedMode) {
        markDegradedModeActive(error.message);
      }
    });

    redisClient.on("end", () => {
      redisReady = false;

      if (config.redisDegradedMode) {
        markDegradedModeActive("Redis connection ended");
      }
    });

    await redisClient.connect();
    await redisClient.ping();
    redisReady = true;
    markDegradedModeRecovered();

    logger.info("Redis connected");
    return {
      available: true,
    };
  } catch (error) {
    redisReady = false;

    if (redisClient) {
      try {
        await redisClient.quit();
      } catch {
        // Best effort cleanup.
      }
    }

    redisClient = null;

    if (config.redisDegradedMode) {
      markDegradedModeActive(error.message);
      return {
        available: false,
      };
    }

    throw error;
  }
};

export const isRedisReady = () => {
  return redisReady && Boolean(redisClient);
};

export const getRedisClient = () => {
  return redisClient;
};

export const closeRedis = async () => {
  if (!redisClient) {
    redisReady = false;
    redisInitialized = false;
    return;
  }

  try {
    await redisClient.quit();
  } catch (error) {
    logger.warn("Redis quit failed, forcing disconnect", {
      errorMessage: error.message,
    });
    redisClient.disconnect();
  } finally {
    redisClient = null;
    redisReady = false;
    redisInitialized = false;
    degradedModeActive = false;
  }
};
