import mongoose from "mongoose";
import FinancialRecord from "../models/FinancialRecord.js";
import { createHttpError } from "../utils/httpError.js";

const DECIMAL_ZERO = "0";

const ensureValidUser = (user) => {
  if (!user?.id) {
    throw createHttpError(401, "Unauthorized");
  }

  if (!mongoose.isValidObjectId(user.id)) {
    throw createHttpError(401, "Invalid user context");
  }
};

const buildScopedMatch = (user, extraMatch = {}) => {
  const match = {
    deleted: false,
    ...extraMatch,
  };

  if (user.role !== "Admin") {
    match.createdBy = new mongoose.Types.ObjectId(user.id);
  }

  return match;
};

const decimalToString = (value) => {
  if (value === undefined || value === null) {
    return DECIMAL_ZERO;
  }

  if (typeof value === "number") {
    return value.toString();
  }

  if (typeof value.toString === "function") {
    return value.toString();
  }

  return String(value);
};

export const getSummaryStats = async (user) => {
  ensureValidUser(user);

  const pipeline = [
    {
      $match: buildScopedMatch(user),
    },
    {
      $group: {
        _id: null,
        totalIncome: {
          $sum: {
            $cond: [
              { $eq: ["$type", "income"] },
              { $ifNull: ["$amount", { $toDecimal: DECIMAL_ZERO }] },
              { $toDecimal: DECIMAL_ZERO },
            ],
          },
        },
        totalExpense: {
          $sum: {
            $cond: [
              { $eq: ["$type", "expense"] },
              { $ifNull: ["$amount", { $toDecimal: DECIMAL_ZERO }] },
              { $toDecimal: DECIMAL_ZERO },
            ],
          },
        },
      },
    },
    {
      $project: {
        _id: 0,
        totalIncome: 1,
        totalExpense: 1,
        netBalance: {
          $subtract: ["$totalIncome", "$totalExpense"],
        },
      },
    },
  ];

  const [summary = null] = await FinancialRecord.aggregate(pipeline);

  if (!summary) {
    return {
      totalIncome: DECIMAL_ZERO,
      totalExpense: DECIMAL_ZERO,
      netBalance: DECIMAL_ZERO,
    };
  }

  return {
    totalIncome: decimalToString(summary.totalIncome),
    totalExpense: decimalToString(summary.totalExpense),
    netBalance: decimalToString(summary.netBalance),
  };
};

export const getCategoryStats = async (user) => {
  ensureValidUser(user);

  const pipeline = [
    {
      $match: buildScopedMatch(user, {
        type: "expense",
      }),
    },
    {
      $group: {
        _id: {
          $let: {
            vars: {
              normalizedCategory: {
                $trim: {
                  input: { $ifNull: ["$category", ""] },
                },
              },
            },
            in: {
              $cond: [
                { $eq: ["$$normalizedCategory", ""] },
                "Uncategorized",
                "$$normalizedCategory",
              ],
            },
          },
        },
        totalExpense: {
          $sum: { $ifNull: ["$amount", { $toDecimal: DECIMAL_ZERO }] },
        },
        count: {
          $sum: 1,
        },
      },
    },
    {
      $project: {
        _id: 0,
        category: "$_id",
        totalExpense: 1,
        count: 1,
      },
    },
    {
      $sort: {
        totalExpense: -1,
        category: 1,
      },
    },
  ];

  const categories = await FinancialRecord.aggregate(pipeline);

  return categories.map((entry) => {
    return {
      category: entry.category,
      totalExpense: decimalToString(entry.totalExpense),
      count: entry.count,
    };
  });
};

export const getMonthlyStats = async (user) => {
  ensureValidUser(user);

  const pipeline = [
    {
      $match: buildScopedMatch(user, {
        date: { $type: "date" },
      }),
    },
    {
      $group: {
        _id: {
          year: { $year: "$date" },
          month: { $month: "$date" },
        },
        totalIncome: {
          $sum: {
            $cond: [
              { $eq: ["$type", "income"] },
              { $ifNull: ["$amount", { $toDecimal: DECIMAL_ZERO }] },
              { $toDecimal: DECIMAL_ZERO },
            ],
          },
        },
        totalExpense: {
          $sum: {
            $cond: [
              { $eq: ["$type", "expense"] },
              { $ifNull: ["$amount", { $toDecimal: DECIMAL_ZERO }] },
              { $toDecimal: DECIMAL_ZERO },
            ],
          },
        },
      },
    },
    {
      $project: {
        _id: 0,
        year: "$_id.year",
        month: "$_id.month",
        totalIncome: 1,
        totalExpense: 1,
        netBalance: {
          $subtract: ["$totalIncome", "$totalExpense"],
        },
      },
    },
    {
      $sort: {
        year: 1,
        month: 1,
      },
    },
  ];

  const monthlyStats = await FinancialRecord.aggregate(pipeline);

  return monthlyStats.map((entry) => {
    return {
      year: entry.year,
      month: entry.month,
      totalIncome: decimalToString(entry.totalIncome),
      totalExpense: decimalToString(entry.totalExpense),
      netBalance: decimalToString(entry.netBalance),
    };
  });
};
