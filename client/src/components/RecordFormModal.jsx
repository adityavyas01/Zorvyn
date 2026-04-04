import { useEffect, useMemo, useState } from "react";

const emptyFormState = {
  amount: "",
  type: "expense",
  category: "",
  date: "",
  note: "",
};

const toDateTimeLocalValue = (value) => {
  if (!value) {
    return "";
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return "";
  }

  const timezoneAdjustedDate = new Date(parsedDate.getTime() - parsedDate.getTimezoneOffset() * 60000);
  return timezoneAdjustedDate.toISOString().slice(0, 16);
};

const toPayload = (formState) => {
  const parsedAmount = Number.parseFloat(formState.amount);

  return {
    amount: parsedAmount,
    type: formState.type,
    category: formState.category.trim(),
    note: formState.note.trim(),
    ...(formState.date
      ? {
          date: new Date(formState.date).toISOString(),
        }
      : {}),
  };
};

function RecordFormModal({
  isOpen,
  mode = "create",
  record = null,
  canSubmit = true,
  submitDisabledReason = "",
  isSubmitting = false,
  errorMessage = "",
  onClose,
  onSubmit,
}) {
  const [formState, setFormState] = useState(emptyFormState);
  const [fieldErrors, setFieldErrors] = useState({
    amount: "",
    type: "",
    date: "",
  });
  const [validationError, setValidationError] = useState("");

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    if (!record) {
      setFormState(emptyFormState);
      setFieldErrors({
        amount: "",
        type: "",
        date: "",
      });
      setValidationError("");
      return;
    }

    setFormState({
      amount: record.amount?.toString?.() || "",
      type: record.type || "expense",
      category: record.category || "",
      date: toDateTimeLocalValue(record.date),
      note: record.note || "",
    });
    setFieldErrors({
      amount: "",
      type: "",
      date: "",
    });
    setValidationError("");
  }, [isOpen, record]);

  const modalTitle = useMemo(() => {
    return mode === "edit" ? "Update Record" : "Create Record";
  }, [mode]);

  if (!isOpen) {
    return null;
  }

  const onFieldChange = (event) => {
    const { name, value } = event.target;

    setFormState((previous) => {
      return {
        ...previous,
        [name]: value,
      };
    });

    if (validationError) {
      setValidationError("");
    }

    setFieldErrors((previous) => {
      return {
        ...previous,
        [name]: "",
      };
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!canSubmit) {
      return;
    }

    const parsedAmount = Number.parseFloat(formState.amount);
    const nextFieldErrors = {
      amount: "",
      type: "",
      date: "",
    };

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      nextFieldErrors.amount = "Amount must be a positive number.";
    }

    if (!formState.type) {
      nextFieldErrors.type = "Type is required.";
    }

    if (formState.date) {
      const parsedDate = new Date(formState.date);

      if (Number.isNaN(parsedDate.getTime())) {
        nextFieldErrors.date = "Date must be valid.";
      } else if (parsedDate > new Date()) {
        nextFieldErrors.date = "Date cannot be in the future.";
      }
    }

    const firstError = nextFieldErrors.amount || nextFieldErrors.type || nextFieldErrors.date;

    setFieldErrors(nextFieldErrors);

    if (firstError) {
      setValidationError(firstError);
      return;
    }

    await onSubmit(toPayload(formState));
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/55 px-4 py-8">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white/95 p-6 shadow-panel dark:border-slate-700 dark:bg-slate-900/95">
        <div className="mb-5 flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{modalTitle}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-400 dark:border-slate-700 dark:text-slate-200"
          >
            Close
          </button>
        </div>

        {!canSubmit && (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-sm text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
            {submitDisabledReason}
          </div>
        )}

        {(validationError || errorMessage) && (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50/80 p-3 text-sm text-rose-700 dark:border-rose-900/70 dark:bg-rose-950/30 dark:text-rose-300">
            {validationError || errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
            Amount
            <input
              name="amount"
              type="number"
              step="0.01"
              min="0.01"
              value={formState.amount}
              onChange={onFieldChange}
              aria-invalid={Boolean(fieldErrors.amount)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              required
            />
            {fieldErrors.amount && <span className="text-xs text-rose-600 dark:text-rose-300">{fieldErrors.amount}</span>}
          </label>

          <label className="grid gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
            Type
            <select
              name="type"
              value={formState.type}
              onChange={onFieldChange}
              aria-invalid={Boolean(fieldErrors.type)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              required
            >
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
            {fieldErrors.type && <span className="text-xs text-rose-600 dark:text-rose-300">{fieldErrors.type}</span>}
          </label>

          <label className="grid gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
            Category
            <input
              name="category"
              type="text"
              value={formState.category}
              onChange={onFieldChange}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              placeholder="e.g. Utilities"
            />
          </label>

          <label className="grid gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
            Date
            <input
              name="date"
              type="datetime-local"
              value={formState.date}
              onChange={onFieldChange}
              aria-invalid={Boolean(fieldErrors.date)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
            {fieldErrors.date && <span className="text-xs text-rose-600 dark:text-rose-300">{fieldErrors.date}</span>}
          </label>

          <label className="grid gap-2 text-sm font-medium text-slate-700 dark:text-slate-200 md:col-span-2">
            Note
            <textarea
              name="note"
              value={formState.note}
              onChange={onFieldChange}
              rows={3}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              placeholder="Optional note"
            />
          </label>

          <div className="md:col-span-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit || isSubmitting}
              className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-700 border-r-transparent" />}
              {isSubmitting ? "Saving..." : mode === "edit" ? "Save Changes" : "Create Record"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default RecordFormModal;
