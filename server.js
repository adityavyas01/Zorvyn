import app from "./src/app.js";
import config from "./src/config/index.js";
import { connectDB } from "./src/config/db.js";
import { closeRedis, initRedis } from "./src/config/redis.js";
import { closeAuditQueue } from "./src/queues/auditQueue.js";
import { startAuditWorker, stopAuditWorker } from "./src/workers/auditWorker.js";
import logger from "./src/utils/logger.js";
import mongoose from "mongoose";

const PORT = config.port || 3000;
const MAX_DB_RETRIES = 5;
const RETRY_DELAY_MS = 3000;
const DB_CONNECT_TIMEOUT_MS = 7000;
const SHUTDOWN_TIMEOUT_MS = 10000;

let httpServer = null;
let shuttingDown = false;
let processHandlersRegistered = false;

const delay = (ms) => new Promise((resolve) => {
  setTimeout(resolve, ms);
});

const getMissingRequiredConfig = () => {
  const requiredConfig = [
    {
      key: "DB_URL",
      value: config.dbUrl,
    },
    {
      key: "JWT_SECRET",
      value: config.jwtSecret,
    },
  ];

  return requiredConfig
    .filter((item) => !String(item.value || "").trim())
    .map((item) => item.key);
};

const assertRequiredConfig = () => {
  const missingConfig = getMissingRequiredConfig();

  if (missingConfig.length === 0) {
    return;
  }

  throw new Error("Missing required environment variables: " + missingConfig.join(", "));
};

const startHttpServer = async () => {
  return new Promise((resolve, reject) => {
    const server = app.listen(PORT, () => {
      logger.info("Server running on port " + PORT, {
        port: PORT,
      });
      resolve(server);
    });

    server.on("error", reject);
  });
};

const closeHttpServer = async () => {
  if (!httpServer) {
    return;
  }

  await new Promise((resolve, reject) => {
    httpServer.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });

  httpServer = null;
};

const shutdown = async (reason, exitCode = 0) => {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  logger.info("Shutdown initiated", { reason });

  const forceShutdownTimer = setTimeout(() => {
    logger.error("Forced shutdown timeout reached", {
      reason,
      timeoutMs: SHUTDOWN_TIMEOUT_MS,
    });
    process.exit(exitCode === 0 ? 1 : exitCode);
  }, SHUTDOWN_TIMEOUT_MS);

  if (typeof forceShutdownTimer.unref === "function") {
    forceShutdownTimer.unref();
  }

  let finalExitCode = exitCode;

  try {
    await closeHttpServer();
    await stopAuditWorker();
    await closeAuditQueue();
    await closeRedis();

    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }

    logger.info("Shutdown complete", { reason });
  } catch (error) {
    finalExitCode = 1;
    logger.error("Shutdown encountered an error", {
      reason,
      errorMessage: error.message,
      stack: error.stack,
    });
  } finally {
    clearTimeout(forceShutdownTimer);
    process.exit(finalExitCode);
  }
};

const registerProcessHandlers = () => {
  if (processHandlersRegistered) {
    return;
  }

  processHandlersRegistered = true;

  process.on("SIGINT", () => {
    void shutdown("SIGINT", 0);
  });

  process.on("SIGTERM", () => {
    void shutdown("SIGTERM", 0);
  });

  process.on("unhandledRejection", (reason) => {
    logger.error("Unhandled promise rejection", {
      reason: reason instanceof Error ? reason.message : String(reason),
      stack: reason instanceof Error ? reason.stack : undefined,
    });

    void shutdown("unhandledRejection", 1);
  });

  process.on("uncaughtException", (error) => {
    logger.error("Uncaught exception", {
      errorMessage: error.message,
      stack: error.stack,
    });

    void shutdown("uncaughtException", 1);
  });
};

const startServer = async () => {
  assertRequiredConfig();

  for (let attempt = 1; attempt <= MAX_DB_RETRIES; attempt += 1) {
    try {
      await connectDB(DB_CONNECT_TIMEOUT_MS);
      const redisState = await initRedis();

      if (redisState.available) {
        try {
          startAuditWorker();
        } catch (error) {
          logger.error("Audit worker failed to start", {
            errorMessage: error.message,
          });
        }
      } else {
        logger.warn(
          "Redis unavailable. Running in degraded mode: in-memory cache/idempotency fallbacks are active and audit logs are written directly."
        );
      }

      httpServer = await startHttpServer();

      return;
    } catch (error) {
      const attemptsLeft = MAX_DB_RETRIES - attempt;

      if (attemptsLeft === 0) {
        logger.error(
          "Database connection failed after " + MAX_DB_RETRIES + " attempts. Exiting process.",
          {
            maxRetries: MAX_DB_RETRIES,
            errorMessage: error.message,
          }
        );
        process.exit(1);
      }

      logger.warn(
        "Database connection attempt " +
          attempt +
          " failed. Retrying in " +
          RETRY_DELAY_MS / 1000 +
          "s...",
        {
          attempt,
          retryDelayMs: RETRY_DELAY_MS,
          errorMessage: error.message,
        }
      );
      await delay(RETRY_DELAY_MS);
    }
  }
};

const bootstrap = async () => {
  registerProcessHandlers();
  await startServer();
};

bootstrap().catch((error) => {
  logger.error("Fatal startup error", {
    errorMessage: error.message,
    stack: error.stack,
  });
  void shutdown("startup_failure", 1);
});
