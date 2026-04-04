import { Worker } from "bullmq";
import config from "../config/index.js";
import { createRedisConnection, isRedisReady } from "../config/redis.js";
import { writeAuditLog } from "../services/auditLogService.js";
import logger from "../utils/logger.js";

let auditWorker = null;
let workerStarted = false;

export const startAuditWorker = () => {
  if (workerStarted) {
    return auditWorker;
  }

  if (!isRedisReady()) {
    return null;
  }

  try {
    auditWorker = new Worker(
      config.auditQueueName,
      async (job) => {
        await writeAuditLog(job.data);
      },
      {
        connection: createRedisConnection(),
        concurrency: 1,
      }
    );
  } catch (error) {
    logger.error("Failed to start audit worker", {
      errorMessage: error.message,
    });
    throw error;
  }

  auditWorker.on("ready", () => {
    logger.info("Audit worker ready");
  });

  auditWorker.on("failed", (job, error) => {
    logger.error("Audit job failed", {
      jobId: job?.id || "unknown",
      errorMessage: error.message,
    });
  });

  auditWorker.on("error", (error) => {
    logger.error("Audit worker error", {
      errorMessage: error.message,
    });
  });

  workerStarted = true;
  return auditWorker;
};

export const stopAuditWorker = async () => {
  if (!auditWorker) {
    workerStarted = false;
    return;
  }

  const workerToClose = auditWorker;
  auditWorker = null;
  workerStarted = false;

  try {
    await workerToClose.close();
    logger.info("Audit worker stopped");
  } catch (error) {
    logger.error("Failed to stop audit worker", {
      errorMessage: error.message,
    });
    throw error;
  }
};
