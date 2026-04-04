import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import CategoryChart from "../components/CategoryChart.jsx";
import MonthlyChart from "../components/MonthlyChart.jsx";
import PageLayout from "../components/PageLayout.jsx";
import StatsCard from "../components/StatsCard.jsx";
import { useAuth } from "../hooks/useAuth.jsx";
import { getCategoryStats, getMonthlyStats, getSummaryStats } from "../services/statsService.js";

const amountFormatter = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const INITIAL_LOADING_STATE = {
  summary: true,
  category: true,
  monthly: true,
};

const INITIAL_ERROR_STATE = {
  summary: "",
  category: "",
  monthly: "",
};

const toNumber = (value) => {
  const parsedValue = Number.parseFloat(value);

  return Number.isFinite(parsedValue) ? parsedValue : 0;
};

const formatAmount = (value) => {
  return amountFormatter.format(toNumber(value));
};

const getErrorMessage = (error, fallbackMessage) => {
  return error?.response?.data?.error || fallbackMessage;
};

function Dashboard() {
  const { role } = useAuth();
  const [summaryData, setSummaryData] = useState(null);
  const [categoryData, setCategoryData] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [loadingState, setLoadingState] = useState(INITIAL_LOADING_STATE);
  const [errorState, setErrorState] = useState(INITIAL_ERROR_STATE);

  const loadDashboardStats = useCallback(async ({ showFeedback = false } = {}) => {
    setLoadingState(INITIAL_LOADING_STATE);
    setErrorState(INITIAL_ERROR_STATE);

    let successfulSections = 0;
    let failedSections = 0;

    const [summaryResult, categoryResult, monthlyResult] = await Promise.allSettled([
      getSummaryStats(),
      getCategoryStats(),
      getMonthlyStats(),
    ]);

    if (summaryResult.status === "fulfilled") {
      setSummaryData(summaryResult.value);
      successfulSections += 1;
    } else if (summaryResult.reason?.response?.status !== 401) {
      failedSections += 1;
      setErrorState((previous) => {
        return {
          ...previous,
          summary: getErrorMessage(summaryResult.reason, "Failed to load summary stats."),
        };
      });
    }

    if (categoryResult.status === "fulfilled") {
      setCategoryData(categoryResult.value);
      successfulSections += 1;
    } else if (categoryResult.reason?.response?.status !== 401) {
      failedSections += 1;
      setErrorState((previous) => {
        return {
          ...previous,
          category: getErrorMessage(categoryResult.reason, "Failed to load category stats."),
        };
      });
    }

    if (monthlyResult.status === "fulfilled") {
      setMonthlyData(monthlyResult.value);
      successfulSections += 1;
    } else if (monthlyResult.reason?.response?.status !== 401) {
      failedSections += 1;
      setErrorState((previous) => {
        return {
          ...previous,
          monthly: getErrorMessage(monthlyResult.reason, "Failed to load monthly stats."),
        };
      });
    }

    setLoadingState({
      summary: false,
      category: false,
      monthly: false,
    });

    if (showFeedback) {
      if (failedSections === 0) {
        toast.success("Dashboard refreshed successfully.");
      } else if (successfulSections > 0) {
        toast.error("Some dashboard sections failed to refresh.");
      } else {
        toast.error("Failed to refresh dashboard data.");
      }
    }
  }, []);

  useEffect(() => {
    loadDashboardStats();
  }, [loadDashboardStats]);

  const incomeValue = useMemo(() => {
    return formatAmount(summaryData?.totalIncome || "0");
  }, [summaryData]);

  const expenseValue = useMemo(() => {
    return formatAmount(summaryData?.totalExpense || "0");
  }, [summaryData]);

  const netBalanceNumber = useMemo(() => {
    return toNumber(summaryData?.netBalance || "0");
  }, [summaryData]);

  const netBalanceValue = useMemo(() => {
    return formatAmount(summaryData?.netBalance || "0");
  }, [summaryData]);

  const isSummaryEmpty = useMemo(() => {
    const hasNoIncome = toNumber(summaryData?.totalIncome || "0") === 0;
    const hasNoExpense = toNumber(summaryData?.totalExpense || "0") === 0;

    return hasNoIncome && hasNoExpense;
  }, [summaryData]);

  const hasAnyError = Boolean(errorState.summary || errorState.category || errorState.monthly);

  return (
    <PageLayout
      title="Dashboard"
      description="Live analytics from summary, category, and monthly stats endpoints."
    >
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Snapshot of your financial position with breakdown and monthly trend insights.
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {role === "Admin" ? "Scope: all records" : "Scope: your records only"}
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            loadDashboardStats({ showFeedback: true });
          }}
          disabled={loadingState.summary || loadingState.category || loadingState.monthly}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white/80 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {(loadingState.summary || loadingState.category || loadingState.monthly) && (
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-500 border-r-transparent dark:border-slate-300" />
          )}
          {loadingState.summary || loadingState.category || loadingState.monthly ? "Refreshing..." : "Refresh stats"}
        </button>
      </div>

      {hasAnyError && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-sm text-amber-700 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-200">
          Some dashboard sections could not be loaded. Use the retry actions on chart cards or refresh stats.
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <StatsCard
          title="Total Income"
          value={incomeValue}
          helperText="Sum of all income records"
          tone="income"
          loading={loadingState.summary}
          error={errorState.summary}
          isEmpty={isSummaryEmpty}
        />
        <StatsCard
          title="Total Expense"
          value={expenseValue}
          helperText="Sum of all expense records"
          tone="expense"
          loading={loadingState.summary}
          error={errorState.summary}
          isEmpty={isSummaryEmpty}
        />
        <StatsCard
          title="Net Balance"
          value={netBalanceValue}
          helperText="Income minus expense"
          tone={netBalanceNumber < 0 ? "expense" : "balance"}
          loading={loadingState.summary}
          error={errorState.summary}
          isEmpty={isSummaryEmpty}
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <CategoryChart
          data={categoryData}
          loading={loadingState.category}
          error={errorState.category}
          onRetry={loadDashboardStats}
        />
        <MonthlyChart
          data={monthlyData}
          loading={loadingState.monthly}
          error={errorState.monthly}
          onRetry={loadDashboardStats}
        />
      </div>
    </PageLayout>
  );
}

export default Dashboard;
