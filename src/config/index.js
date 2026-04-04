import dotenv from "dotenv";

dotenv.config();

const parseInteger = (value, fallbackValue) => {
  const parsedValue = Number.parseInt(value, 10);
  return Number.isNaN(parsedValue) ? fallbackValue : parsedValue;
};

const parseBoolean = (value, fallbackValue) => {
  if (value === undefined) {
    return fallbackValue;
  }

  return String(value).toLowerCase() === "true";
};

const config = {
  port: process.env.PORT || 3000,
  jwtSecret: process.env.JWT_SECRET || "",
  dbUrl: process.env.DB_URL || "",
  redisUrl: process.env.REDIS_URL || "redis://127.0.0.1:6379",
  redisConnectTimeoutMs: parseInteger(process.env.REDIS_CONNECT_TIMEOUT_MS, 4000),
  redisDegradedMode: parseBoolean(process.env.REDIS_DEGRADED_MODE, true),
  statsCacheTtlSeconds: parseInteger(process.env.STATS_CACHE_TTL_SECONDS, 300),
  statsMonthlyCacheTtlSeconds: parseInteger(process.env.STATS_MONTHLY_CACHE_TTL_SECONDS, 900),
  idempotencyTtlSeconds: parseInteger(process.env.IDEMPOTENCY_TTL_SECONDS, 86400),
  idempotencyLockTtlSeconds: parseInteger(process.env.IDEMPOTENCY_LOCK_TTL_SECONDS, 30),
  auditQueueName: process.env.AUDIT_QUEUE_NAME || "audit-log-jobs",
};

export default config;
export const {
  port,
  jwtSecret,
  dbUrl,
  redisUrl,
  redisConnectTimeoutMs,
  redisDegradedMode,
  statsCacheTtlSeconds,
  statsMonthlyCacheTtlSeconds,
  idempotencyTtlSeconds,
  idempotencyLockTtlSeconds,
  auditQueueName,
} = config;
