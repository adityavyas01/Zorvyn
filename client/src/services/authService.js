import api from "./api.js";

export const loginUser = async (credentials) => {
  const response = await api.post("/auth/login", credentials);

  return {
    token: response?.data?.data?.token || "",
    user: response?.data?.data?.user || null,
  };
};

export const registerUser = async (payload) => {
  const response = await api.post("/auth/register", payload);
  return response.data;
};
