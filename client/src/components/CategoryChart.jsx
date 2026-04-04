import { ArcElement, Chart as ChartJS, Legend, Tooltip } from "chart.js";
import { useMemo } from "react";
import { Pie } from "react-chartjs-2";
import { useTheme } from "../hooks/useTheme.jsx";

ChartJS.register(ArcElement, Tooltip, Legend);

const CHART_COLORS = [
  "#06b6d4",
  "#0ea5e9",
  "#14b8a6",
  "#10b981",
  "#f59e0b",
  "#f97316",
  "#f43f5e",
  "#8b5cf6",
  "#6366f1",
];

const amountFormatter = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const toNumber = (value) => {
  const parsedValue = Number.parseFloat(value);

  return Number.isFinite(parsedValue) ? parsedValue : 0;
};

function CategoryChart({ data = [], loading = false, error = "", onRetry }) {
  const { isDarkMode } = useTheme();

  const chartData = useMemo(() => {
    return {
      labels: data.map((item) => item.category),
      datasets: [
        {
          label: "Expense by category",
          data: data.map((item) => toNumber(item.totalExpense)),
          backgroundColor: data.map((_, index) => CHART_COLORS[index % CHART_COLORS.length]),
          borderWidth: 0,
        },
      ],
    };
  }, [data]);

  const options = useMemo(() => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            color: isDarkMode ? "#cbd5e1" : "#334155",
            padding: 16,
            usePointStyle: true,
            pointStyle: "circle",
          },
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              const index = context.dataIndex;
              const count = data[index]?.count || 0;
              const amount = amountFormatter.format(context.raw || 0);

              return `${context.label}: ${amount} (${count} records)`;
            },
          },
        },
      },
    };
  }, [data, isDarkMode]);

  if (loading) {
    return (
      <article className="page-reveal rounded-2xl border border-slate-200/80 bg-white/80 p-5 backdrop-blur dark:border-slate-700 dark:bg-slate-900/70">
        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Category Breakdown</h3>
        <div className="mt-4 flex h-72 items-center justify-center rounded-xl bg-slate-100/80 dark:bg-slate-800/70">
          <p className="text-sm text-slate-600 dark:text-slate-300">Loading category chart...</p>
        </div>
      </article>
    );
  }

  if (error) {
    return (
      <article className="page-reveal rounded-2xl border border-rose-200 bg-rose-50/80 p-5 backdrop-blur dark:border-rose-900/70 dark:bg-rose-950/30">
        <h3 className="text-base font-semibold text-rose-700 dark:text-rose-300">Category Breakdown</h3>
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
        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Category Breakdown</h3>
        <div className="mt-4 flex h-72 items-center justify-center rounded-xl bg-slate-100/80 dark:bg-slate-800/70">
          <p className="text-sm text-slate-600 dark:text-slate-300">No expense data available yet.</p>
        </div>
      </article>
    );
  }

  return (
    <article className="page-reveal rounded-2xl border border-slate-200/80 bg-white/80 p-5 backdrop-blur dark:border-slate-700 dark:bg-slate-900/70">
      <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Category Breakdown</h3>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Expense share by category</p>
      <div className="mt-4 h-72">
        <Pie data={chartData} options={options} />
      </div>
    </article>
  );
}

export default CategoryChart;
