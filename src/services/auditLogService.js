import mongoose from "mongoose";
import AuditLog from "../models/AuditLog.js";

const toObjectId = (value) => {
  if (value instanceof mongoose.Types.ObjectId) {
    return value;
  }

  if (mongoose.isValidObjectId(value)) {
    return new mongoose.Types.ObjectId(value);
  }

  return undefined;
};

const normalizeRequestMetadata = (request = {}) => {
  return {
    ip: String(request.ip || ""),
    userAgent: String(request.userAgent || ""),
    method: String(request.method || ""),
    path: String(request.path || ""),
  };
};

export const writeAuditLog = async (eventPayload) => {
  const actorId = toObjectId(eventPayload?.actorId);
  const entityId = toObjectId(eventPayload?.entityId);

  if (!actorId || !entityId || !eventPayload?.action) {
    throw new Error("Invalid audit event payload");
  }

  const metadata =
    eventPayload.metadata && typeof eventPayload.metadata === "object"
      ? eventPayload.metadata
      : {};

  const document = await AuditLog.create({
    actorId,
    actorRole: String(eventPayload.actorRole || "Viewer"),
    action: String(eventPayload.action).toLowerCase(),
    entity: String(eventPayload.entity || "financialRecord"),
    entityId,
    status: String(eventPayload.status || "success").toLowerCase(),
    metadata,
    request: normalizeRequestMetadata(eventPayload.request),
  });

  return {
    id: document._id.toString(),
    action: document.action,
    entity: document.entity,
    entityId: document.entityId.toString(),
    createdAt: document.createdAt,
  };
};
