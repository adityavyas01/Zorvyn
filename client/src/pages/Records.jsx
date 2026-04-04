import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import RecordFormModal from "../components/RecordFormModal.jsx";
import RecordTable from "../components/RecordTable.jsx";
import { useAuth } from "../hooks/useAuth.jsx";
import PageLayout from "../components/PageLayout.jsx";
import { createRecord, deleteRecord, getRecords, updateRecord } from "../services/recordsService.js";

const EMPTY_FILTERS = {
  type: "",
  category: "",
  startDate: "",
  endDate: "",
};

const DEFAULT_LIMIT = 20;

const toStartDateIso = (dateValue) => {
  return `${dateValue}T00:00:00.000Z`;
};

const toEndDateIso = (dateValue) => {
  return `${dateValue}T23:59:59.999Z`;
};

const generateIdempotencyKey = () => {
  if (typeof window !== "undefined" && window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }

  return `records-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const sortValue = (value) => {
  if (Array.isArray(value)) {
    return value.map(sortValue);
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  return Object.keys(value)
    .sort()
    .reduce((accumulator, key) => {
      accumulator[key] = sortValue(value[key]);
      return accumulator;
    }, {});
};

const buildPayloadFingerprint = (payload) => {
  return JSON.stringify(sortValue(payload || {}));
};

const getApiErrorMessage = (error, fallbackMessage) => {
  return error?.response?.data?.error || fallbackMessage;
};

const isTransportError = (error) => {
  if (error?.response) {
    return false;
  }

  const normalizedCode = `${error?.code || ""}`.toUpperCase();

  if (normalizedCode === "ERR_NETWORK" || normalizedCode === "ECONNABORTED" || normalizedCode === "ETIMEDOUT") {
    return true;
  }

  return Boolean(error?.request);
};

const getCreateFailureDetails = (error, { didAutoRetry = false } = {}) => {
  const statusCode = error?.response?.status;
  const apiMessage = getApiErrorMessage(error, "Failed to save the record.");
  const normalizedMessage = apiMessage.toLowerCase();

  if (statusCode === 409 && normalizedMessage.includes("different request payload")) {
    return {
      message:
        "This request key was already used for a different payload. Review your form values and submit again.",
      shouldResetIntent: true,
    };
  }

  if (statusCode === 409 && normalizedMessage.includes("already being processed")) {
    return {
      message:
        "A matching request is still being processed. Wait a moment, then submit again to safely reuse the same request key.",
      shouldResetIntent: false,
    };
  }

  if (isTransportError(error)) {
    return {
      message: didAutoRetry
        ? "Network issue persisted after one automatic retry. Submit again to safely retry this same create request."
        : "Network issue prevented confirmation. Submit again to safely retry this same create request.",
      shouldResetIntent: false,
    };
  }

  if (statusCode && statusCode >= 400 && statusCode < 500) {
    return {
      message: apiMessage,
      shouldResetIntent: true,
    };
  }

  return {
    message: apiMessage,
    shouldResetIntent: false,
  };
};

function Records() {
  const { user, role, isViewer, isAnalyst, isAdmin } = useAuth();
  const [records, setRecords] = useState([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_LIMIT);
  const [draftFilters, setDraftFilters] = useState(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(EMPTY_FILTERS);
  const [isLoading, setIsLoading] = useState(true);
  const [recordsError, setRecordsError] = useState("");
  const [actionError, setActionError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [deletingRecordId, setDeletingRecordId] = useState("");
  const createIntentRef = useRef({
    key: "",
    payloadFingerprint: "",
    autoRetryUsed: false,
  });
  const submitGuardRef = useRef(false);

  const userRole = role || user?.role || "Viewer";
  const userId = user?.id || "";
  const canCreateOrEdit = isAdmin || isAnalyst;

  const fetchRecords = useCallback(async ({ showErrorToast = false } = {}) => {
    setIsLoading(true);
    setRecordsError("");

    try {
      const queryParams = {
        page,
        limit,
        ...(appliedFilters.type
          ? {
              type: appliedFilters.type,
            }
          : {}),
        ...(appliedFilters.category.trim()
          ? {
              category: appliedFilters.category.trim(),
            }
          : {}),
        ...(appliedFilters.startDate
          ? {
              startDate: toStartDateIso(appliedFilters.startDate),
            }
          : {}),
        ...(appliedFilters.endDate
          ? {
              endDate: toEndDateIso(appliedFilters.endDate),
            }
          : {}),
      };

      const result = await getRecords(queryParams);
      setRecords(result?.data || []);
      setTotalRecords(result?.total || 0);
      setPage(result?.page || 1);
      setLimit(result?.limit || DEFAULT_LIMIT);
    } catch (error) {
      if (error?.response?.status !== 401) {
        const message = getApiErrorMessage(error, "Failed to load records.");
        setRecordsError(message);

        if (showErrorToast) {
          toast.error(message);
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [appliedFilters, limit, page]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(totalRecords / limit));
  }, [limit, totalRecords]);

  const canEditRecord = useCallback(
    (record) => {
      if (isAdmin) {
        return true;
      }

      if (isAnalyst) {
        return record.createdBy === userId;
      }

      return false;
    },
    [isAdmin, isAnalyst, userId],
  );

  const getEditDisabledReason = useCallback(
    (record) => {
      if (isAdmin) {
        return "";
      }

      if (isAnalyst && record.createdBy !== userId) {
        return "Analysts can edit only their own records.";
      }

      return "Only Analyst or Admin can edit records.";
    },
    [isAdmin, isAnalyst, userId],
  );

  const shouldShowDelete = useCallback((_) => {
    return userRole !== "Viewer";
  }, [userRole]);

  const canDeleteRecord = useCallback((_) => {
    return isAdmin;
  }, [isAdmin]);

  const getDeleteDisabledReason = useCallback((_) => {
    if (isAnalyst) {
      return "Analysts can create and edit own records but cannot delete.";
    }

    if (isViewer) {
      return "Viewers have read-only access.";
    }

    return "Only Admin can delete records.";
  }, [isAnalyst, isViewer]);

  const rolePermissionMessage = useMemo(() => {
    if (isAdmin) {
      return "Admin access: create, edit, and delete are fully enabled.";
    }

    if (isAnalyst) {
      return "Analyst access: you can create records and edit your own records. Delete is disabled.";
    }

    return "Viewer access: read-only mode. Create and edit are disabled, and delete is hidden.";
  }, [isAdmin, isAnalyst]);

  const resetCreateIntent = useCallback(() => {
    createIntentRef.current = {
      key: "",
      payloadFingerprint: "",
      autoRetryUsed: false,
    };
  }, []);

  const getCreateIntent = useCallback((payload) => {
    const payloadFingerprint = buildPayloadFingerprint(payload);
    const currentIntent = createIntentRef.current;

    if (!currentIntent.key || currentIntent.payloadFingerprint !== payloadFingerprint) {
      createIntentRef.current = {
        key: generateIdempotencyKey(),
        payloadFingerprint,
        autoRetryUsed: false,
      };
    }

    return createIntentRef.current;
  }, []);

  const submitCreateWithRetry = useCallback(
    async (payload) => {
      const intent = getCreateIntent(payload);

      const createWithIntent = () => {
        return createRecord(payload, intent.key);
      };

      try {
        const result = await createWithIntent();

        return {
          result,
          didAutoRetry: false,
        };
      } catch (initialError) {
        if (!isTransportError(initialError) || intent.autoRetryUsed) {
          throw initialError;
        }

        intent.autoRetryUsed = true;
        toast("Network issue detected. Retrying once with the same request key...");

        const retryResult = await createWithIntent();

        return {
          result: retryResult,
          didAutoRetry: true,
        };
      }
    },
    [getCreateIntent],
  );

  const openCreateModal = () => {
    if (!canCreateOrEdit) {
      const message = "Only Analyst or Admin can create records.";
      setActionError(message);
      toast.error(message);
      return;
    }

    resetCreateIntent();
    setModalMode("create");
    setSelectedRecord(null);
    setSubmitError("");
    setIsModalOpen(true);
  };

  const openEditModal = (record) => {
    if (!canEditRecord(record)) {
      const message = getEditDisabledReason(record);
      setActionError(message);
      toast.error(message);
      return;
    }

    setModalMode("edit");
    setSelectedRecord(record);
    setSubmitError("");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedRecord(null);
    setSubmitError("");
    resetCreateIntent();
  };

  const handleModalSubmit = async (payload) => {
    if (submitGuardRef.current) {
      return;
    }

    submitGuardRef.current = true;
    setSubmitError("");
    setActionError("");
    setIsSubmitting(true);

    try {
      if (modalMode === "edit" && selectedRecord?.id) {
        const result = await updateRecord(selectedRecord.id, payload);
        toast.success(result.message || "Record updated successfully.");
      } else {
        const { result, didAutoRetry } = await submitCreateWithRetry(payload);

        if (result.replayed) {
          toast.success("A previous matching create request already succeeded. No duplicate record was created.");
        } else if (didAutoRetry) {
          toast.success(result.message || "Record created successfully after one automatic retry.");
        } else {
          toast.success(result.message || "Record created successfully.");
        }
      }

      closeModal();
      await fetchRecords();
    } catch (error) {
      if (error?.response?.status !== 401) {
        if (modalMode === "create") {
          const createFailure = getCreateFailureDetails(error, {
            didAutoRetry: createIntentRef.current.autoRetryUsed,
          });

          setSubmitError(createFailure.message);
          toast.error(createFailure.message);

          if (createFailure.shouldResetIntent) {
            resetCreateIntent();
          }
        } else {
          const message = getApiErrorMessage(error, "Failed to save the record.");
          setSubmitError(message);
          toast.error(message);
        }
      }
    } finally {
      submitGuardRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handleDeleteRecord = async (record) => {
    if (!isAdmin) {
      const message = getDeleteDisabledReason(record);
      setActionError(message);
      toast.error(message);
      return;
    }

    const confirmed = window.confirm("Delete this record? This is a soft delete and can impact dashboard stats.");

    if (!confirmed) {
      return;
    }

    setActionError("");
    setDeletingRecordId(record.id);

    try {
      const result = await deleteRecord(record.id);
      toast.success(result.message || "Record deleted successfully.");

      if (records.length === 1 && page > 1) {
        setPage((previousPage) => {
          return previousPage - 1;
        });
      } else {
        await fetchRecords();
      }
    } catch (error) {
      if (error?.response?.status !== 401) {
        const message = getApiErrorMessage(error, "Failed to delete the record.");
        setActionError(message);
        toast.error(message);
      }
    } finally {
      setDeletingRecordId("");
    }
  };

  const onFilterFieldChange = (event) => {
    const { name, value } = event.target;

    setDraftFilters((previous) => {
      return {
        ...previous,
        [name]: value,
      };
    });
  };

  const applyFilters = (event) => {
    event.preventDefault();
    setActionError("");

    if (draftFilters.startDate && draftFilters.endDate && draftFilters.startDate > draftFilters.endDate) {
      const message = "Start date must be earlier than or equal to end date.";
      setActionError(message);
      toast.error(message);
      return;
    }

    setAppliedFilters(draftFilters);
    setPage(1);
    toast.success("Filters applied.");
  };

  const resetFilters = () => {
    setActionError("");
    setDraftFilters(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
    setPage(1);
    toast.success("Filters reset.");
  };

  const canOpenModal = canCreateOrEdit;
  const modalSubmitAllowed = modalMode === "create" ? canCreateOrEdit : canEditRecord(selectedRecord || {});
  const modalSubmitDisabledReason =
    modalMode === "create"
      ? "Only Analyst or Admin can create records."
      : getEditDisabledReason(selectedRecord || {});

  return (
    <PageLayout
      title="Records"
      description="Manage records with filtering, pagination, and role-aware CRUD actions."
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Use filters and pagination to work through records, then create or edit entries in the modal form.
        </p>

        <button
          type="button"
          onClick={openCreateModal}
          disabled={!canOpenModal}
          title={canOpenModal ? "Create record" : "Only Analyst or Admin can create records."}
          className="rounded-xl bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
          New Record
        </button>
      </div>

      <div className="mb-4 rounded-xl border border-slate-200/80 bg-white/75 p-3 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300">
        {rolePermissionMessage}
      </div>

      {actionError && (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50/80 p-3 text-sm text-rose-700 dark:border-rose-900/70 dark:bg-rose-950/30 dark:text-rose-300">
          {actionError}
        </div>
      )}

      <form onSubmit={applyFilters} className="mb-4 grid gap-3 rounded-2xl border border-slate-200/80 bg-white/80 p-4 dark:border-slate-700 dark:bg-slate-900/70 md:grid-cols-5">
        <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
          Type
          <select
            name="type"
            value={draftFilters.type}
            onChange={onFilterFieldChange}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          >
            <option value="">All</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>
        </label>

        <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
          Category
          <input
            name="category"
            type="text"
            value={draftFilters.category}
            onChange={onFilterFieldChange}
            placeholder="e.g. Travel"
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          />
        </label>

        <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
          Start Date
          <input
            name="startDate"
            type="date"
            value={draftFilters.startDate}
            onChange={onFilterFieldChange}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          />
        </label>

        <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
          End Date
          <input
            name="endDate"
            type="date"
            value={draftFilters.endDate}
            onChange={onFilterFieldChange}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          />
        </label>

        <div className="flex items-end gap-2">
          <button
            type="submit"
            disabled={isLoading}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-500 border-r-transparent dark:border-slate-300" />}
            Apply
          </button>
          <button
            type="button"
            onClick={resetFilters}
            disabled={isLoading}
            className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Reset
          </button>
        </div>
      </form>

      <RecordTable
        records={records}
        loading={isLoading}
        error={recordsError}
        deletingRecordId={deletingRecordId}
        onRetry={() => {
          fetchRecords({ showErrorToast: true });
        }}
        onEdit={openEditModal}
        onDelete={handleDeleteRecord}
        canEditRecord={canEditRecord}
        getEditDisabledReason={getEditDisabledReason}
        canDeleteRecord={canDeleteRecord}
        shouldShowDelete={shouldShowDelete}
        getDeleteDisabledReason={getDeleteDisabledReason}
      />

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/70">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Page {page} of {totalPages} ({totalRecords} records)
        </p>

        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-600 dark:text-slate-300">
            Limit
            <select
              value={limit}
              onChange={(event) => {
                const nextLimit = Number.parseInt(event.target.value, 10);
                setLimit(nextLimit);
                setPage(1);
              }}
              className="ml-2 rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            >
              {[10, 20, 50, 100].map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={() => {
              setPage((previousPage) => {
                return Math.max(1, previousPage - 1);
              });
            }}
            disabled={page === 1 || isLoading}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:border-slate-400 dark:border-slate-700 dark:text-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Previous
          </button>
          <button
            type="button"
            onClick={() => {
              setPage((previousPage) => {
                return Math.min(totalPages, previousPage + 1);
              });
            }}
            disabled={page >= totalPages || isLoading}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:border-slate-400 dark:border-slate-700 dark:text-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>

      <RecordFormModal
        isOpen={isModalOpen}
        mode={modalMode}
        record={selectedRecord}
        canSubmit={modalSubmitAllowed}
        submitDisabledReason={modalSubmitDisabledReason}
        isSubmitting={isSubmitting}
        errorMessage={submitError}
        onClose={closeModal}
        onSubmit={handleModalSubmit}
      />
    </PageLayout>
  );
}

export default Records;
