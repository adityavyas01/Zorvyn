import api from "./api.js";

export const getRecords = async (queryParams = {}) => {
  const response = await api.get("/records", {
    params: queryParams,
  });

  return (
    response?.data?.data || {
      total: 0,
      page: 1,
      limit: 20,
      data: [],
    }
  );
};

export const getRecordById = async (recordId) => {
  const response = await api.get(`/records/${recordId}`);

  return {
    record: response?.data?.data?.record || null,
    message: response?.data?.message || "",
  };
};

export const createRecord = async (payload, idempotencyKey) => {
  if (!idempotencyKey) {
    throw new Error("Idempotency-Key is required for createRecord.");
  }

  const response = await api.post("/records", payload, {
    headers: {
      "Idempotency-Key": idempotencyKey,
    },
  });

  const replayedHeaderValue = response?.headers?.["idempotency-replayed"];

  return {
    record: response?.data?.data?.record || null,
    message: response?.data?.message || "",
    replayed: `${replayedHeaderValue || ""}`.toLowerCase() === "true",
  };
};

export const updateRecord = async (recordId, payload) => {
  const response = await api.put(`/records/${recordId}`, payload);

  return {
    record: response?.data?.data?.record || null,
    message: response?.data?.message || "",
  };
};

export const deleteRecord = async (recordId) => {
  const response = await api.delete(`/records/${recordId}`);

  return {
    record: response?.data?.data?.record || null,
    message: response?.data?.message || "",
  };
};

export const listRecords = getRecords;
