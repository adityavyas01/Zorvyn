import config from "../config/index.js";
import { getRedisClient, isRedisReady } from "../config/redis.js";
import logger from "../utils/logger.js";

const STATS_METRICS = ["summary", "category", "monthly"];
const STATS_METRIC_SET = new Set(STATS_METRICS);
const inMemoryStatsCache = new Map();

let statsCacheWarningShown = false;

const showStatsCacheWarning = (error) => {
  if (statsCacheWarningShown) {
    return;
  }

  statsCacheWarningShown = true;
  logger.warn("Stats cache skipped due to Redis error", {
    errorMessage: error.message,
  });
};

const getStatsScopeToken = (user) => {
  if (user?.role === "Admin") {
    return "admin:all";
  }

  return "user:" + (user?.id || "unknown");
};

const getStatsCacheKey = (metric, user) => {
  return "stats:" + metric + ":" + getStatsScopeToken(user);
};

const getStatsCacheTtl = (metric) => {
  if (metric === "monthly") {
    return config.statsMonthlyCacheTtlSeconds;
  }

  return config.statsCacheTtlSeconds;
};

const readFromMemoryCache = (key) => {
  const cachedEntry = inMemoryStatsCache.get(key);

  if (!cachedEntry) {
    return null;
  }

  if (cachedEntry.expiresAt <= Date.now()) {
    inMemoryStatsCache.delete(key);
    return null;
  }

  return cachedEntry.value;
};

const writeToMemoryCache = (key, value, ttlSeconds) => {
  inMemoryStatsCache.set(key, {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
};

export const getCachedStats = async (metric, user) => {
  if (!STATS_METRIC_SET.has(metric)) {
    return null;
  }

  const cacheKey = getStatsCacheKey(metric, user);

  if (!isRedisReady()) {
    return readFromMemoryCache(cacheKey);
  }

  const redisClient = getRedisClient();

  if (!redisClient) {
    return readFromMemoryCache(cacheKey);
  }

  try {
    const cachedValue = await redisClient.get(cacheKey);

    if (!cachedValue) {
      return null;
    }

    return JSON.parse(cachedValue);
  } catch (error) {
    showStatsCacheWarning(error);
    return null;
  }
};

export const setCachedStats = async (metric, user, payload) => {
  if (!STATS_METRIC_SET.has(metric)) {
    return;
  }

  const cacheKey = getStatsCacheKey(metric, user);
  const ttlSeconds = getStatsCacheTtl(metric);

  if (!isRedisReady()) {
    writeToMemoryCache(cacheKey, payload, ttlSeconds);
    return;
  }

  const redisClient = getRedisClient();

  if (!redisClient) {
    writeToMemoryCache(cacheKey, payload, ttlSeconds);
    return;
  }

  try {
    await redisClient.set(cacheKey, JSON.stringify(payload), "EX", ttlSeconds);
  } catch (error) {
    showStatsCacheWarning(error);
    writeToMemoryCache(cacheKey, payload, ttlSeconds);
  }
};

export const invalidateStatsCacheForUsers = async (userIds = [], options = {}) => {
  const uniqueUserIds = Array.from(
    new Set(
      userIds
        .map((userId) => String(userId || "").trim())
        .filter(Boolean)
    )
  );

  const keysToDelete = [];

  for (const userId of uniqueUserIds) {
    for (const metric of STATS_METRICS) {
      keysToDelete.push("stats:" + metric + ":user:" + userId);
    }
  }

  if (options.includeAdmin) {
    for (const metric of STATS_METRICS) {
      keysToDelete.push("stats:" + metric + ":admin:all");
    }
  }

  if (keysToDelete.length === 0) {
    return;
  }

  keysToDelete.forEach((cacheKey) => {
    inMemoryStatsCache.delete(cacheKey);
  });

  if (!isRedisReady()) {
    return;
  }

  const redisClient = getRedisClient();

  if (!redisClient) {
    return;
  }

  try {
    await redisClient.del(keysToDelete);
  } catch (error) {
    showStatsCacheWarning(error);
  }
};
