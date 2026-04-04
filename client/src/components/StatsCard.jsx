const toneClassMap = {
  income: "text-emerald-600 dark:text-emerald-300",
  expense: "text-rose-600 dark:text-rose-300",
  balance: "text-cyan-600 dark:text-cyan-300",
  neutral: "text-slate-900 dark:text-slate-100",
};

function StatsCard({
  title,
  value,
  helperText,
  tone = "neutral",
  loading = false,
  error = "",
  isEmpty = false,
}) {
  if (loading) {
    return (
      <article className="page-reveal rounded-2xl border border-slate-200/80 bg-white/80 p-5 backdrop-blur dark:border-slate-700 dark:bg-slate-900/70">
        <p className="h-4 w-24 animate-pulse rounded bg-slate-200/80 dark:bg-slate-700/80" />
        <p className="mt-3 h-10 w-36 animate-pulse rounded bg-slate-200/80 dark:bg-slate-700/80" />
        <p className="mt-3 h-4 w-40 animate-pulse rounded bg-slate-200/80 dark:bg-slate-700/80" />
      </article>
    );
  }

  if (error) {
    return (
      <article className="page-reveal rounded-2xl border border-rose-200 bg-rose-50/80 p-5 backdrop-blur dark:border-rose-900/70 dark:bg-rose-950/30">
        <h3 className="text-sm font-semibold text-rose-700 dark:text-rose-300">{title}</h3>
        <p className="mt-3 text-sm text-rose-600 dark:text-rose-200">{error}</p>
      </article>
    );
  }

  const toneClasses = toneClassMap[tone] || toneClassMap.neutral;

  return (
    <article className="page-reveal rounded-2xl border border-slate-200/80 bg-white/80 p-5 backdrop-blur dark:border-slate-700 dark:bg-slate-900/70">
      <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400">{title}</h3>
      <p className={`mt-3 text-3xl font-semibold ${toneClasses}`}>{value}</p>
      <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
        {isEmpty ? "No records yet. Create your first financial entry." : helperText}
      </p>
    </article>
  );
}

export default StatsCard;
