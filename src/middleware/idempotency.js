import { createHash } from "crypto";
import config from "../config/index.js";
import { getRedisClient, isRedisReady } from "../config/redis.js";
import { createHttpError } from "../utils/httpError.js";
import logger from "../utils/logger.js";

let degradedModeWarningShown = false;
const inMemoryResponseStore = new Map();
const inMemoryLockStore = new Map();

const showDegradedModeWarning = () => {
  if (degradedModeWarningShown) {
    return;
  }

  degradedModeWarningShown = true;
  logger.warn("Redis unavailable. Using in-memory idempotency fallback.");
};

const now = () => Date.now();

const purgeExpiredInMemoryEntries = () => {
  const currentTime = now();

  for (const [key, entry] of inMemoryResponseStore.entries()) {
    if (entry.expiresAt <= currentTime) {
      inMemoryResponseStore.delete(key);
    }
  }

  for (const [key, entry] of inMemoryLockStore.entries()) {
    if (entry.expiresAt <= currentTime) {
      inMemoryLockStore.delete(key);
    }
  }
};

const sortValue = (value) => {
  if (Array.isArray(value)) {
    return value.map(sortValue);
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  return Object.keys(value)
    .sort()
    .reduce((accumulator, key) => {
      accumulator[key] = sortValue(value[key]);
      return accumulator;
    }, {});
};

const normalizeResponseBody = (body) => {
  if (typeof body !== "string") {
    return body;
  }

  try {
    return JSON.parse(body);
  } catch {
    return body;
  }
};

const buildFingerprint = (req) => {
  const payload = {
    userId: req.user?.id || "",
    method: req.method || "",
    path: (req.originalUrl || req.path || "").split("?")[0],
    body: sortValue(req.body || {}),
  };

  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
};

const parseCachedPayload = (rawPayload) => {
  if (!rawPayload) {
    return null;
  }

  try {
    return JSON.parse(rawPayload);
  } catch {
    return null;
  }
};

const responseKeyFor = (userId, idempotencyKey) => {
  return "idempotency:response:" + userId + ":" + idempotencyKey;
};

const lockKeyFor = (userId, idempotencyKey) => {
  return "idempotency:lock:" + userId + ":" + idempotencyKey;
};

const replayCachedResponse = (res, payload) => {
  res.set("Idempotency-Replayed", "true");
  return res.status(payload.statusCode).json(payload.body);
};

const readCachedResponse = async (redisClient, responseKey) => {
  if (redisClient) {
    return parseCachedPayload(await redisClient.get(responseKey));
  }

  const cachedEntry = inMemoryResponseStore.get(responseKey);

  if (!cachedEntry) {
    return null;
  }

  if (cachedEntry.expiresAt <= now()) {
    inMemoryResponseStore.delete(responseKey);
    return null;
  }

  return cachedEntry.payload;
};

const acquireRequestLock = async (redisClient, lockKey, fingerprint) => {
  if (redisClient) {
    const lockAcquired = await redisClient.set(
      lockKey,
      fingerprint,
      "NX",
      "EX",
      config.idempotencyLockTtlSeconds
    );

    return Boolean(lockAcquired);
  }

  const existingLock = inMemoryLockStore.get(lockKey);

  if (existingLock && existingLock.expiresAt > now()) {
    return false;
  }

  inMemoryLockStore.set(lockKey, {
    fingerprint,
    expiresAt: now() + config.idempotencyLockTtlSeconds * 1000,
  });

  return true;
};

const releaseRequestLock = async (redisClient, lockKey) => {
  if (redisClient) {
    await redisClient.del(lockKey);
    return;
  }

  inMemoryLockStore.delete(lockKey);
};

const saveCachedResponse = async (redisClient, responseKey, payload) => {
  if (redisClient) {
    await redisClient.set(
      responseKey,
      JSON.stringify(payload),
      "EX",
      config.idempotencyTtlSeconds
    );

    return;
  }

  inMemoryResponseStore.set(responseKey, {
    payload,
    expiresAt: now() + config.idempotencyTtlSeconds * 1000,
  });
};

const idempotencyMiddleware = async (req, res, next) => {
  purgeExpiredInMemoryEntries();

  if (!req.user?.id) {
    return next(createHttpError(401, "Unauthorized"));
  }

  const idempotencyKeyHeader = req.get("Idempotency-Key");

  if (!idempotencyKeyHeader || !idempotencyKeyHeader.trim()) {
    return next(createHttpError(400, "Idempotency-Key header is required"));
  }

  const idempotencyKey = idempotencyKeyHeader.trim();

  if (idempotencyKey.length > 128) {
    return next(createHttpError(400, "Idempotency-Key must be 128 characters or fewer"));
  }

  const redisClient = isRedisReady() ? getRedisClient() : null;

  if (!redisClient) {
    showDegradedModeWarning();
  }

  const fingerprint = buildFingerprint(req);
  const responseKey = responseKeyFor(req.user.id, idempotencyKey);
  const lockKey = lockKeyFor(req.user.id, idempotencyKey);

  try {
    const cachedPayload = await readCachedResponse(redisClient, responseKey);

    if (cachedPayload) {
      if (cachedPayload.fingerprint !== fingerprint) {
        return next(
          createHttpError(409, "Idempotency-Key was already used with a different request payload")
        );
      }

      return replayCachedResponse(res, cachedPayload);
    }

    const lockAcquired = await acquireRequestLock(redisClient, lockKey, fingerprint);

    if (!lockAcquired) {
      const inFlightPayload = await readCachedResponse(redisClient, responseKey);

      if (inFlightPayload) {
        if (inFlightPayload.fingerprint !== fingerprint) {
          return next(
            createHttpError(409, "Idempotency-Key was already used with a different request payload")
          );
        }

        return replayCachedResponse(res, inFlightPayload);
      }

      return next(
        createHttpError(409, "A request with this Idempotency-Key is already being processed")
      );
    }

    let responseFinalized = false;

    const finalizeResponse = async (body, statusCode) => {
      if (responseFinalized) {
        return;
      }

      responseFinalized = true;

      try {
        if (statusCode >= 200 && statusCode < 300) {
          const cachedResponsePayload = {
            fingerprint,
            statusCode,
            body,
          };

          await saveCachedResponse(redisClient, responseKey, cachedResponsePayload);
        } else {
          await releaseRequestLock(redisClient, lockKey);
          return;
        }

        await releaseRequestLock(redisClient, lockKey);
      } catch (error) {
        logger.error("Failed to persist idempotency response", {
          errorMessage: error.message,
        });

        try {
          await releaseRequestLock(redisClient, lockKey);
        } catch {
          // Best effort cleanup.
        }
      }
    };

    const originalJson = res.json.bind(res);
    res.json = (body) => {
      void finalizeResponse(normalizeResponseBody(body), res.statusCode);
      return originalJson(body);
    };

    const originalSend = res.send.bind(res);
    res.send = (body) => {
      void finalizeResponse(normalizeResponseBody(body), res.statusCode);
      return originalSend(body);
    };

    res.on("close", () => {
      void finalizeResponse(undefined, res.statusCode);
    });

    return next();
  } catch (error) {
    return next(error);
  }
};

export default idempotencyMiddleware;
