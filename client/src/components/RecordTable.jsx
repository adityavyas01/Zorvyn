const amountFormatter = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const formatRecordDate = (value) => {
  if (!value) {
    return "-";
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return "-";
  }

  return parsedDate.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
};

const formatAmount = (amount) => {
  const parsedAmount = Number.parseFloat(amount);

  if (!Number.isFinite(parsedAmount)) {
    return "0.00";
  }

  return amountFormatter.format(parsedAmount);
};

function RecordTable({
  records = [],
  loading = false,
  error = "",
  deletingRecordId = "",
  onRetry,
  onEdit,
  onDelete,
  canEditRecord,
  getEditDisabledReason,
  canDeleteRecord,
  shouldShowDelete,
  getDeleteDisabledReason,
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300">
            <th className="px-3 py-2 font-medium">Date</th>
            <th className="px-3 py-2 font-medium">Type</th>
            <th className="px-3 py-2 font-medium">Category</th>
            <th className="px-3 py-2 font-medium">Amount</th>
            <th className="px-3 py-2 font-medium">Note</th>
            <th className="px-3 py-2 font-medium">Actions</th>
          </tr>
        </thead>

        <tbody>
          {loading && (
            <>
              {[...Array(5)].map((_, index) => (
                <tr key={`loading-row-${index}`} className="border-b border-slate-100 dark:border-slate-800">
                  <td className="px-3 py-3">
                    <div className="h-4 w-24 animate-pulse rounded bg-slate-200/80 dark:bg-slate-700/80" />
                  </td>
                  <td className="px-3 py-3">
                    <div className="h-4 w-16 animate-pulse rounded bg-slate-200/80 dark:bg-slate-700/80" />
                  </td>
                  <td className="px-3 py-3">
                    <div className="h-4 w-28 animate-pulse rounded bg-slate-200/80 dark:bg-slate-700/80" />
                  </td>
                  <td className="px-3 py-3">
                    <div className="h-4 w-20 animate-pulse rounded bg-slate-200/80 dark:bg-slate-700/80" />
                  </td>
                  <td className="px-3 py-3">
                    <div className="h-4 w-36 animate-pulse rounded bg-slate-200/80 dark:bg-slate-700/80" />
                  </td>
                  <td className="px-3 py-3">
                    <div className="h-4 w-24 animate-pulse rounded bg-slate-200/80 dark:bg-slate-700/80" />
                  </td>
                </tr>
              ))}
            </>
          )}

          {!loading && error && (
            <tr>
              <td className="px-3 py-6" colSpan={6}>
                <div className="rounded-xl border border-rose-200 bg-rose-50/80 p-4 dark:border-rose-900/70 dark:bg-rose-950/30">
                  <p className="text-sm text-rose-700 dark:text-rose-300">{error}</p>
                  {onRetry && (
                    <button
                      type="button"
                      onClick={onRetry}
                      className="mt-3 rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-rose-500"
                    >
                      Retry
                    </button>
                  )}
                </div>
              </td>
            </tr>
          )}

          {!loading && !error && records.length === 0 && (
            <tr>
              <td className="px-3 py-6 text-slate-500 dark:text-slate-400" colSpan={6}>
                No records found for the current filters.
              </td>
            </tr>
          )}

          {!loading && !error && records.length > 0 &&
            records.map((record) => {
              const recordType = record.type === "income" ? "Income" : "Expense";
              const typeClassName =
                record.type === "income"
                  ? "text-emerald-700 dark:text-emerald-300"
                  : "text-rose-700 dark:text-rose-300";
              const isDeletePending = deletingRecordId === record.id;
              const canEdit = canEditRecord(record);
              const canDelete = canDeleteRecord(record);
              const showDeleteAction = shouldShowDelete(record);

              return (
                <tr key={record.id} className="border-b border-slate-100 dark:border-slate-800">
                  <td className="px-3 py-3 text-slate-700 dark:text-slate-200">{formatRecordDate(record.date)}</td>
                  <td className="px-3 py-3">
                    <span className={`font-semibold ${typeClassName}`}>{recordType}</span>
                  </td>
                  <td className="px-3 py-3 text-slate-700 dark:text-slate-200">{record.category || "Uncategorized"}</td>
                  <td className="px-3 py-3 text-slate-700 dark:text-slate-200">{formatAmount(record.amount)}</td>
                  <td className="max-w-[300px] px-3 py-3 text-slate-600 dark:text-slate-300">{record.note || "-"}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          onEdit(record);
                        }}
                        disabled={!canEdit}
                        title={canEdit ? "Edit record" : getEditDisabledReason(record)}
                        className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-400 dark:border-slate-700 dark:text-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Edit
                      </button>

                      {showDeleteAction && (
                        <button
                          type="button"
                          onClick={() => {
                            onDelete(record);
                          }}
                          disabled={!canDelete || isDeletePending}
                          title={canDelete ? "Delete record" : getDeleteDisabledReason(record)}
                          className="rounded-md border border-rose-300 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:border-rose-400 dark:border-rose-700 dark:text-rose-300 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {isDeletePending ? "Deleting..." : "Delete"}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
        </tbody>
      </table>
    </div>
  );
}

export default RecordTable;
