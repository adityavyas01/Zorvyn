import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import mongoose from "mongoose";
import config from "./config/index.js";
import { isRedisReady } from "./config/redis.js";
import authRoutes from "./routes/authRoutes.js";
import financialRecordRoutes from "./routes/financialRecordRoutes.js";
import statsRoutes from "./routes/statsRoutes.js";
import globalErrorHandler from "./middleware/errorHandler.js";
import { createHttpError } from "./utils/httpError.js";
import { errorResponse, successResponse } from "./utils/response.js";
import logger, { morganStream } from "./utils/logger.js";
import { swaggerUiServe, swaggerUiSetup } from "./config/swagger.js";

const app = express();

const WINDOW_15_MINUTES_MS = 15 * 60 * 1000;
const REQUEST_BODY_LIMIT = "1mb";
const GLOBAL_RATE_LIMIT_MAX = 100;
const LOGIN_RATE_LIMIT_MAX = 5;
const HEALTH_ENDPOINT_PATH = "/health";

const DB_CONNECTION_STATUS_LABELS = {
  0: "disconnected",
  1: "connected",
  2: "connecting",
  3: "disconnecting",
};

const getHealthDetails = () => {
  const dbReadyState = mongoose.connection.readyState;
  const dbConnected = dbReadyState === 1;
  const redisAvailable = isRedisReady();

  let status = "healthy";
  let statusCode = 200;

  if (!dbConnected) {
    status = "unhealthy";
    statusCode = 503;
  } else if (!redisAvailable && config.redisDegradedMode) {
    status = "degraded";
  } else if (!redisAvailable) {
    status = "unhealthy";
    statusCode = 503;
  }

  return {
    status,
    statusCode,
    data: {
      status,
      server: {
        status: "running",
        uptimeSeconds: Math.floor(process.uptime()),
      },
      database: {
        status: DB_CONNECTION_STATUS_LABELS[dbReadyState] || "unknown",
        readyState: dbReadyState,
      },
      redis: {
        status: redisAvailable ? "connected" : "unavailable",
        available: redisAvailable,
        degradedMode: config.redisDegradedMode,
      },
      checkedAt: new Date().toISOString(),
    },
  };
};

const corsOriginAllowlist = (process.env.CORS_ORIGIN || process.env.CORS_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

if (process.env.NODE_ENV === "production" && corsOriginAllowlist.length === 0) {
  logger.warn(
    "CORS allowlist is empty in production. Set CORS_ORIGIN/CORS_ORIGINS to deployed frontend origins.",
  );
} else if (corsOriginAllowlist.length > 0) {
  logger.info("CORS allowlist configured", {
    origins: corsOriginAllowlist,
    originCount: corsOriginAllowlist.length,
  });
}

const helmetOptions = {
  frameguard: { action: "deny" },
  referrerPolicy: { policy: "no-referrer" },
  crossOriginOpenerPolicy: { policy: "same-origin" },
};

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) {
      return callback(null, true);
    }

    if (corsOriginAllowlist.includes(origin)) {
      return callback(null, true);
    }

    return callback(createHttpError(403, "Origin is not allowed by CORS policy"));
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};

const createRateLimitHandler = (message) =>
  (req, res) => {
    errorResponse(res, message, 429);
  };

const globalRateLimiter = rateLimit({
  windowMs: WINDOW_15_MINUTES_MS,
  max: GLOBAL_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    const requestPath = (req.path || req.originalUrl || "").split("?")[0];
    return requestPath === HEALTH_ENDPOINT_PATH;
  },
  handler: createRateLimitHandler("Too many requests. Please try again later."),
});

const loginRateLimiter = rateLimit({
  windowMs: WINDOW_15_MINUTES_MS,
  max: LOGIN_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler: createRateLimitHandler("Too many login attempts. Please try again in 15 minutes."),
});

const DANGEROUS_KEYS = new Set(["__proto__", "prototype", "constructor"]);

const sanitizeArrayInPlace = (items) => {
  for (let index = 0; index < items.length; index += 1) {
    const currentValue = items[index];

    if (typeof currentValue === "string") {
      items[index] = currentValue.trim();
      continue;
    }

    if (Array.isArray(currentValue)) {
      sanitizeArrayInPlace(currentValue);
      continue;
    }

    if (currentValue && typeof currentValue === "object") {
      sanitizeObjectInPlace(currentValue);
    }
  }
};

const sanitizeObjectInPlace = (value) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return;
  }

  Object.entries(value).forEach(([key, nestedValue]) => {
    if (key.startsWith("$") || key.includes(".") || DANGEROUS_KEYS.has(key)) {
      delete value[key];
      return;
    }

    if (typeof nestedValue === "string") {
      value[key] = nestedValue.trim();
      return;
    }

    if (Array.isArray(nestedValue)) {
      sanitizeArrayInPlace(nestedValue);
      return;
    }

    sanitizeObjectInPlace(nestedValue);
  });
};

const sanitizeRequestInput = (req, res, next) => {
  sanitizeObjectInPlace(req.body);
  sanitizeObjectInPlace(req.query);
  sanitizeObjectInPlace(req.params);
  next();
};

app.disable("x-powered-by");
app.use(helmet(helmetOptions));
app.use(cors(corsOptions));
app.use(morgan("combined", { stream: morganStream }));
app.use(express.json({ limit: REQUEST_BODY_LIMIT }));
app.use(express.urlencoded({ extended: true, limit: REQUEST_BODY_LIMIT }));
app.use(sanitizeRequestInput);
app.use(globalRateLimiter);

app.use("/auth/login", loginRateLimiter);

app.use("/auth", authRoutes);
app.use("/records", financialRecordRoutes);
app.use("/stats", statsRoutes);
app.use("/api-docs", swaggerUiServe, swaggerUiSetup);

app.get("/", (req, res) => {
  res.status(200).send("API running");
});

app.get(HEALTH_ENDPOINT_PATH, (req, res) => {
  const health = getHealthDetails();

  const messageByStatus = {
    healthy: "Health check passed",
    degraded: "Health check passed with degraded dependencies",
    unhealthy: "Health check failed",
  };

  res.status(health.statusCode);
  return successResponse(res, health.data, messageByStatus[health.status]);
});

app.use(globalErrorHandler);

export default app;
