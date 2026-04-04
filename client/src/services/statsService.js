import api from "./api.js";

export const getSummaryStats = async () => {
  const response = await api.get("/stats/summary");

  return (
    response?.data?.data || {
      totalIncome: "0",
      totalExpense: "0",
      netBalance: "0",
    }
  );
};

export const getCategoryStats = async () => {
  const response = await api.get("/stats/category");

  return response?.data?.data || [];
};

export const getMonthlyStats = async () => {
  const response = await api.get("/stats/monthly");

  return response?.data?.data || [];
};
