import { Queue } from "bullmq";
import config from "../config/index.js";
import { createRedisConnection, isRedisReady } from "../config/redis.js";
import logger from "../utils/logger.js";

let auditQueue = null;

const getAuditQueue = () => {
  if (auditQueue) {
    return auditQueue;
  }

  if (!isRedisReady()) {
    return null;
  }

  auditQueue = new Queue(config.auditQueueName, {
    connection: createRedisConnection(),
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 1000,
      },
      removeOnComplete: 100,
      removeOnFail: 500,
    },
  });

  return auditQueue;
};

export const addAuditLogJob = async (auditPayload) => {
  const queue = getAuditQueue();

  if (!queue) {
    return false;
  }

  await queue.add("write-audit-log", auditPayload);
  return true;
};

export const closeAuditQueue = async () => {
  if (!auditQueue) {
    return;
  }

  try {
    await auditQueue.close();
  } catch (error) {
    logger.error("Failed to close audit queue", {
      errorMessage: error.message,
    });
    throw error;
  } finally {
    auditQueue = null;
  }
};
