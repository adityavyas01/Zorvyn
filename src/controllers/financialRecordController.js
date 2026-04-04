import {
  createRecord,
  getRecordById,
  listRecords,
  softDeleteRecord,
  updateRecord,
} from "../services/financialRecordService.js";
import { invalidateStatsCacheForUsers } from "../cache/statsCache.js";
import { trackAuditEvent } from "../services/auditService.js";
import { successResponse } from "../utils/response.js";

const getRequestMetadata = (req) => {
  return {
    ip: req.ip || "",
    userAgent: req.get("user-agent") || "",
    method: req.method || "",
    path: (req.originalUrl || req.path || "").split("?")[0],
  };
};

const refreshStatsCacheAfterMutation = async (record) => {
  if (!record?.createdBy) {
    return;
  }

  await invalidateStatsCacheForUsers([record.createdBy], {
    includeAdmin: true,
  });
};

const saveAuditEvent = async ({ req, action, record, metadata }) => {
  if (!record?.id || !req.user?.id) {
    return;
  }

  await trackAuditEvent({
    actorId: req.user.id,
    actorRole: req.user.role,
    action,
    entity: "financialRecord",
    entityId: record.id,
    status: "success",
    metadata,
    request: getRequestMetadata(req),
  });
};

export const createFinancialRecord = async (req, res, next) => {
  try {
    const record = await createRecord(req.user, req.body);
    await refreshStatsCacheAfterMutation(record);
    await saveAuditEvent({
      req,
      action: "create",
      record,
      metadata: {
        amount: record.amount,
        type: record.type,
        category: record.category,
        date: record.date,
      },
    });

    res.status(201);
    return successResponse(
      res,
      {
        record,
      },
      "Financial record created successfully"
    );
  } catch (error) {
    return next(error);
  }
};

export const getFinancialRecords = async (req, res, next) => {
  try {
    const recordsResult = await listRecords(req.user, req.query);

    return successResponse(res, recordsResult, "Financial records fetched successfully");
  } catch (error) {
    return next(error);
  }
};

export const getFinancialRecord = async (req, res, next) => {
  try {
    const record = await getRecordById(req.user, req.params.id);

    return successResponse(
      res,
      {
        record,
      },
      "Financial record fetched successfully"
    );
  } catch (error) {
    return next(error);
  }
};

export const updateFinancialRecord = async (req, res, next) => {
  try {
    const record = await updateRecord(req.user, req.params.id, req.body);
    await refreshStatsCacheAfterMutation(record);
    await saveAuditEvent({
      req,
      action: "update",
      record,
      metadata: {
        updatedFields: Object.keys(req.body || {}),
        amount: record.amount,
        type: record.type,
        category: record.category,
        date: record.date,
      },
    });

    return successResponse(
      res,
      {
        record,
      },
      "Financial record updated successfully"
    );
  } catch (error) {
    return next(error);
  }
};

export const deleteFinancialRecord = async (req, res, next) => {
  try {
    const record = await softDeleteRecord(req.user, req.params.id);
    await refreshStatsCacheAfterMutation(record);
    await saveAuditEvent({
      req,
      action: "delete",
      record,
      metadata: {
        deleted: record.deleted,
      },
    });

    return successResponse(
      res,
      {
        record,
      },
      "Financial record deleted successfully"
    );
  } catch (error) {
    return next(error);
  }
};
