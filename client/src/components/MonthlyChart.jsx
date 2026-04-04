import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Title,
  Tooltip,
} from "chart.js";
import { useMemo } from "react";
import { Bar } from "react-chartjs-2";
import { useTheme } from "../hooks/useTheme.jsx";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const amountFormatter = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const toNumber = (value) => {
  const parsedValue = Number.parseFloat(value);

  return Number.isFinite(parsedValue) ? parsedValue : 0;
};

const formatMonthLabel = (year, month) => {
  const monthDate = new Date(year, month - 1, 1);

  return monthDate.toLocaleDateString(undefined, {
    month: "short",
    year: "numeric",
  });
};

function MonthlyChart({ data = [], loading = false, error = "", onRetry }) {
  const { isDarkMode } = useTheme();

  const chartData = useMemo(() => {
    return {
      labels: data.map((item) => formatMonthLabel(item.year, item.month)),
      datasets: [
        {
          label: "Income",
          data: data.map((item) => toNumber(item.totalIncome)),
          backgroundColor: "#22c55e",
          borderRadius: 6,
          maxBarThickness: 28,
        },
        {
          label: "Expense",
          data: data.map((item) => toNumber(item.totalExpense)),
          backgroundColor: "#f97316",
          borderRadius: 6,
          maxBarThickness: 28,
        },
      ],
    };
  }, [data]);

  const options = useMemo(() => {
    const textColor = isDarkMode ? "#cbd5e1" : "#334155";
    const gridColor = isDarkMode ? "rgba(148, 163, 184, 0.18)" : "rgba(100, 116, 139, 0.14)";

    return {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          ticks: {
            color: textColor,
          },
          grid: {
            color: gridColor,
          },
        },
        y: {
          beginAtZero: true,
          ticks: {
            color: textColor,
            callback: (value) => amountFormatter.format(value),
          },
          grid: {
            color: gridColor,
          },
        },
      },
      plugins: {
        legend: {
          labels: {
            color: textColor,
            usePointStyle: true,
            pointStyle: "rectRounded",
          },
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              return `${context.dataset.label}: ${amountFormatter.format(context.raw || 0)}`;
            },
          },
        },
      },
    };
  }, [isDarkMode]);

  if (loading) {
    return (
      <article className="page-reveal rounded-2xl border border-slate-200/80 bg-white/80 p-5 backdrop-blur dark:border-slate-700 dark:bg-slate-900/70">
        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Monthly Trends</h3>
        <div className="mt-4 flex h-72 items-center justify-center rounded-xl bg-slate-100/80 dark:bg-slate-800/70">
          <p className="text-sm text-slate-600 dark:text-slate-300">Loading monthly chart...</p>
        </div>
      </article>
    );
  }

  if (error) {
    return (
      <article className="page-reveal rounded-2xl border border-rose-200 bg-rose-50/80 p-5 backdrop-blur dark:border-rose-900/70 dark:bg-rose-950/30">
        <h3 className="text-base font-semibold text-rose-700 dark:text-rose-300">Monthly Trends</h3>
        <p className="mt-3 text-sm text-rose-600 dark:text-rose-200">{error}</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-4 rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-rose-500"
          >
            Retry
          </button>
        )}
      </article>
    );
  }

  if (!data.length) {
    return (
      <article className="page-reveal rounded-2xl border border-slate-200/80 bg-white/80 p-5 backdrop-blur dark:border-slate-700 dark:bg-slate-900/70">
        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Monthly Trends</h3>
        <div className="mt-4 flex h-72 items-center justify-center rounded-xl bg-slate-100/80 dark:bg-slate-800/70">
          <p className="text-sm text-slate-600 dark:text-slate-300">No monthly data available yet.</p>
        </div>
      </article>
    );
  }

  return (
    <article className="page-reveal rounded-2xl border border-slate-200/80 bg-white/80 p-5 backdrop-blur dark:border-slate-700 dark:bg-slate-900/70">
      <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Monthly Trends</h3>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Income vs expense by month</p>
      <div className="mt-4 h-72">
        <Bar data={chartData} options={options} />
      </div>
    </article>
  );
}

export default MonthlyChart;
