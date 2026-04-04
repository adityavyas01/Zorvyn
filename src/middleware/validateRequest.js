import Joi from "joi";
import { createHttpError } from "../utils/httpError.js";

const baseValidatorOptions = {
  abortEarly: false,
  convert: true,
};

const bodyValidatorOptions = {
  ...baseValidatorOptions,
  stripUnknown: true,
};

const queryAndParamsValidatorOptions = {
  ...baseValidatorOptions,
  stripUnknown: false,
};

const sanitizeJoiMessage = (message) => message.replace(/"/g, "");

const applyValidatedSegment = (req, segment, value) => {
  if (segment === "body") {
    req.body = value;
    return;
  }

  const currentSegment = req[segment];

  if (currentSegment && typeof currentSegment === "object") {
    Object.keys(currentSegment).forEach((key) => {
      delete currentSegment[key];
    });

    Object.assign(currentSegment, value);
    return;
  }

  req[segment] = value;
};

const normalizeInputValues = (value) => {
  if (Array.isArray(value)) {
    return value.map(normalizeInputValues);
  }

  if (value && typeof value === "object") {
    return Object.entries(value).reduce((accumulator, [key, nestedValue]) => {
      accumulator[key] = normalizeInputValues(nestedValue);
      return accumulator;
    }, {});
  }

  if (typeof value === "string") {
    return value.trim();
  }

  return value;
};

const validateSegment = (segment, schema, options) => {
  return (req, res, next) => {
    const normalizedSegmentValue = normalizeInputValues(req[segment] || {});
    const { error, value } = schema.validate(normalizedSegmentValue, options);

    if (error) {
      const message = error.details.map((item) => sanitizeJoiMessage(item.message)).join(", ");
      return next(createHttpError(400, message));
    }

    applyValidatedSegment(req, segment, value);
    return next();
  };
};

export const validateBody = (schema) => {
  return validateSegment("body", schema, bodyValidatorOptions);
};

export const validateQuery = (schema) => {
  return validateSegment("query", schema, queryAndParamsValidatorOptions);
};

export const validateParams = (schema) => {
  return validateSegment("params", schema, queryAndParamsValidatorOptions);
};

export const registerSchema = Joi.object({
  name: Joi.string().trim().min(1).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
});

export const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

const financialRecordBase = {
  amount: Joi.number().positive(),
  type: Joi.string().valid("income", "expense"),
  category: Joi.string().trim().allow(""),
  date: Joi.date().iso(),
  note: Joi.string().trim().allow(""),
};

export const createFinancialRecordSchema = Joi.object({
  amount: financialRecordBase.amount.required(),
  type: financialRecordBase.type.required(),
  category: financialRecordBase.category.optional(),
  date: financialRecordBase.date.optional(),
  note: financialRecordBase.note.optional(),
}).required();

export const updateFinancialRecordSchema = Joi.object({
  amount: financialRecordBase.amount.optional(),
  type: financialRecordBase.type.optional(),
  category: financialRecordBase.category.optional(),
  date: financialRecordBase.date.optional(),
  note: financialRecordBase.note.optional(),
})
  .min(1)
  .required();

const MAX_PAGE = 10000;
const MAX_LIMIT = 100;

export const recordsListQuerySchema = Joi.object({
  type: Joi.string().trim().lowercase().valid("income", "expense").optional(),
  category: Joi.string().trim().min(1).optional(),
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().optional(),
  page: Joi.number().integer().min(1).max(MAX_PAGE).optional(),
  limit: Joi.number().integer().min(1).max(MAX_LIMIT).optional(),
})
  .custom((value, helpers) => {
    if (value.startDate && value.endDate && value.startDate > value.endDate) {
      return helpers.error("any.invalid", {
        message: "startDate must be less than or equal to endDate",
      });
    }

    return value;
  }, "records list query validation")
  .messages({
    "any.invalid": "{{#message}}",
  })
  .unknown(false)
  .required();

export const recordIdParamsSchema = Joi.object({
  id: Joi.string()
    .trim()
    .pattern(/^[a-fA-F0-9]{24}$/)
    .required()
    .messages({
      "string.pattern.base": "Invalid record id",
    }),
})
  .unknown(false)
  .required();

export const statsQuerySchema = Joi.object({})
  .unknown(false)
  .required();
