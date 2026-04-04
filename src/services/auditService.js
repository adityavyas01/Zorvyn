import { isRedisReady } from "../config/redis.js";
import { addAuditLogJob } from "../queues/auditQueue.js";
import { writeAuditLog } from "./auditLogService.js";
import logger from "../utils/logger.js";

let queueFallbackWarningShown = false;

const showQueueFallbackWarning = (reason) => {
  if (queueFallbackWarningShown) {
    return;
  }

  queueFallbackWarningShown = true;
  logger.warn("Audit queue unavailable. Falling back to direct writes. Reason: " + reason);
};

const normalizeAuditEvent = (auditEvent = {}) => {
  if (!auditEvent.actorId || !auditEvent.entityId || !auditEvent.action) {
    return null;
  }

  return {
    actorId: auditEvent.actorId,
    actorRole: String(auditEvent.actorRole || "Viewer"),
    action: String(auditEvent.action || "").toLowerCase(),
    entity: String(auditEvent.entity || "financialRecord"),
    entityId: auditEvent.entityId,
    status: String(auditEvent.status || "success").toLowerCase(),
    metadata:
      auditEvent.metadata && typeof auditEvent.metadata === "object"
        ? auditEvent.metadata
        : {},
    request:
      auditEvent.request && typeof auditEvent.request === "object"
        ? auditEvent.request
        : {},
  };
};

export const trackAuditEvent = async (auditEvent) => {
  const normalizedEvent = normalizeAuditEvent(auditEvent);

  if (!normalizedEvent) {
    return {
      tracked: false,
      mode: "skipped",
    };
  }

  if (isRedisReady()) {
    try {
      const queued = await addAuditLogJob(normalizedEvent);

      if (queued) {
        return {
          tracked: true,
          mode: "queue",
        };
      }
    } catch (error) {
      showQueueFallbackWarning(error.message);
    }
  }

  try {
    await writeAuditLog(normalizedEvent);
    return {
      tracked: true,
      mode: "direct",
    };
  } catch (error) {
    logger.error("Failed to persist audit event", {
      errorMessage: error.message,
    });
    return {
      tracked: false,
      mode: "failed",
    };
  }
};
