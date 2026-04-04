import {
  getCategoryStats as getCategoryStatsData,
  getMonthlyStats as getMonthlyStatsData,
  getSummaryStats as getSummaryStatsData,
} from "../services/statsService.js";
import { getCachedStats, setCachedStats } from "../cache/statsCache.js";
import { successResponse } from "../utils/response.js";

const loadStats = async (metric, user, resolver) => {
  const cachedStats = await getCachedStats(metric, user);

  if (cachedStats !== null) {
    return cachedStats;
  }

  const calculatedStats = await resolver(user);
  await setCachedStats(metric, user, calculatedStats);

  return calculatedStats;
};

export const getSummaryStats = async (req, res, next) => {
  try {
    const summary = await loadStats("summary", req.user, getSummaryStatsData);

    return successResponse(res, summary, "Summary stats fetched successfully");
  } catch (error) {
    return next(error);
  }
};

export const getCategoryStats = async (req, res, next) => {
  try {
    const categoryStats = await loadStats("category", req.user, getCategoryStatsData);

    return successResponse(res, categoryStats, "Category stats fetched successfully");
  } catch (error) {
    return next(error);
  }
};

export const getMonthlyStats = async (req, res, next) => {
  try {
    const monthlyStats = await loadStats("monthly", req.user, getMonthlyStatsData);

    return successResponse(res, monthlyStats, "Monthly stats fetched successfully");
  } catch (error) {
    return next(error);
  }
};
