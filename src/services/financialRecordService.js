import mongoose from "mongoose";
import FinancialRecord from "../models/FinancialRecord.js";
import logger from "../utils/logger.js";
import { createHttpError } from "../utils/httpError.js";

const READ_ALL_ROLES = new Set(["Analyst", "Admin"]);

const buildReadFilter = (user) => {
  const filter = { deleted: false };

  if (!READ_ALL_ROLES.has(user.role)) {
    filter.createdBy = user.id;
  }

  return filter;
};

const normalizePayload = (payload = {}) => {
  const allowedFields = ["amount", "type", "category", "date", "note"];
  const normalized = {};

  for (const field of allowedFields) {
    if (payload[field] !== undefined) {
      normalized[field] = payload[field];
    }
  }

  return normalized;
};

const parsePositiveInteger = (value, fieldName, defaultValue) => {
  if (value === undefined) {
    return defaultValue;
  }

  const parsedValue = Number.parseInt(value, 10);

  if (Number.isNaN(parsedValue) || parsedValue < 1) {
    throw createHttpError(400, `${fieldName} must be a positive integer`);
  }

  return parsedValue;
};

const parseDateParam = (value, fieldName) => {
  if (value === undefined) {
    return undefined;
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    throw createHttpError(400, `${fieldName} must be a valid date`);
  }

  return parsedDate;
};

const escapeRegex = (value) => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

const ensureValidRecordId = (recordId) => {
  if (!mongoose.isValidObjectId(recordId)) {
    throw createHttpError(400, "Invalid record id");
  }
};

const sanitizeFinancialRecord = (record) => {
  const raw = record.toObject ? record.toObject() : record;

  return {
    id: raw._id.toString(),
    amount: raw.amount?.toString ? raw.amount.toString() : raw.amount,
    type: raw.type,
    category: raw.category,
    date: raw.date,
    note: raw.note,
    createdBy:
      raw.createdBy && typeof raw.createdBy === "object" && raw.createdBy._id
        ? raw.createdBy._id.toString()
        : raw.createdBy?.toString?.() || raw.createdBy,
    deleted: raw.deleted,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
};

export const createRecord = async (user, payload) => {
  if (!user?.id) {
    throw createHttpError(401, "Unauthorized");
  }

  const recordData = normalizePayload(payload);

  if (recordData.amount === undefined) {
    throw createHttpError(400, "Amount is required");
  }

  if (!recordData.type) {
    throw createHttpError(400, "Type is required");
  }

  const record = await FinancialRecord.create({
    ...recordData,
    createdBy: user.id,
  });

  return sanitizeFinancialRecord(record);
};

export const listRecords = async (user, queryParams = {}) => {
  if (!user?.id) {
    throw createHttpError(401, "Unauthorized");
  }

  const filter = buildReadFilter(user);

  if (queryParams.type !== undefined) {
    const typeValue = String(queryParams.type).trim().toLowerCase();

    if (!["income", "expense"].includes(typeValue)) {
      throw createHttpError(400, "type must be income or expense");
    }

    filter.type = typeValue;
  }

  if (queryParams.category !== undefined) {
    const categoryValue = String(queryParams.category).trim();

    if (!categoryValue) {
      throw createHttpError(400, "category cannot be empty");
    }

    filter.category = {
      $regex: escapeRegex(categoryValue),
      $options: "i",
    };
  }

  const startDate = parseDateParam(queryParams.startDate, "startDate");
  const endDate = parseDateParam(queryParams.endDate, "endDate");

  if (startDate && endDate && startDate > endDate) {
    throw createHttpError(400, "startDate must be less than or equal to endDate");
  }

  if (startDate || endDate) {
    filter.date = {};

    if (startDate) {
      filter.date.$gte = startDate;
    }

    if (endDate) {
      filter.date.$lte = endDate;
    }
  }

  const page = parsePositiveInteger(queryParams.page, "page", 1);
  const limit = parsePositiveInteger(queryParams.limit, "limit", 20);
  const skip = (page - 1) * limit;

  const [records, total] = await Promise.all([
    FinancialRecord.find(filter)
      .sort({
        date: -1,
        createdAt: -1,
      })
      .skip(skip)
      .limit(limit),
    FinancialRecord.countDocuments(filter),
  ]);

  return {
    total,
    page,
    limit,
    data: records.map((record) => sanitizeFinancialRecord(record)),
  };
};

export const getRecordById = async (user, recordId) => {
  if (!user?.id) {
    throw createHttpError(401, "Unauthorized");
  }

  ensureValidRecordId(recordId);

  const record = await FinancialRecord.findOne({
    ...buildReadFilter(user),
    _id: recordId,
  });

  if (!record) {
    throw createHttpError(404, "Financial record not found");
  }

  return sanitizeFinancialRecord(record);
};

export const updateRecord = async (user, recordId, payload) => {
  if (!user?.id) {
    throw createHttpError(401, "Unauthorized");
  }

  ensureValidRecordId(recordId);

  const record = await FinancialRecord.findOne({
    _id: recordId,
    deleted: false,
  });

  if (!record) {
    throw createHttpError(404, "Financial record not found");
  }

  const isOwner = record.createdBy.toString() === user.id;
  const isAdmin = user.role === "Admin";

  if (!isAdmin && !isOwner) {
    logger.warn("RBAC denial", {
      event: "rbac_denial",
      reason: "ownership_mismatch",
      userId: user.id || null,
      userRole: user.role || null,
      recordId,
      recordOwnerId: record.createdBy.toString(),
    });
    throw createHttpError(403, "Insufficient permissions");
  }

  const updates = normalizePayload(payload);

  if (Object.keys(updates).length === 0) {
    throw createHttpError(400, "No valid fields provided for update");
  }

  Object.assign(record, updates);
  await record.save();

  return sanitizeFinancialRecord(record);
};

export const softDeleteRecord = async (user, recordId) => {
  if (!user?.id) {
    throw createHttpError(401, "Unauthorized");
  }

  ensureValidRecordId(recordId);

  const record = await FinancialRecord.findOne({
    _id: recordId,
    deleted: false,
  });

  if (!record) {
    throw createHttpError(404, "Financial record not found");
  }

  record.deleted = true;
  await record.save();

  return sanitizeFinancialRecord(record);
};
