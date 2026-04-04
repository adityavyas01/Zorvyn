import axios from "axios";
import { AUTH_TOKEN_STORAGE_KEY, AUTH_USER_STORAGE_KEY } from "../utils/constants.js";

let unauthorizedHandler = null;

const isProductionBuild = import.meta.env.PROD;
const configuredApiBaseUrl = String(
  import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || "",
).trim();

if (isProductionBuild && !configuredApiBaseUrl) {
  const errorMessage =
    "Missing API base URL in production. Set VITE_API_URL (preferred) or VITE_API_BASE_URL.";

  console.error(errorMessage);
  throw new Error(errorMessage);
}

if (isProductionBuild && configuredApiBaseUrl && !configuredApiBaseUrl.toLowerCase().startsWith("https://")) {
  const errorMessage =
    "Invalid API base URL in production. VITE_API_URL must use HTTPS to avoid mixed-content issues.";

  console.error(errorMessage, {
    configuredApiBaseUrl,
  });
  throw new Error(errorMessage);
}

if (!import.meta.env.VITE_API_URL && import.meta.env.VITE_API_BASE_URL) {
  console.warn("VITE_API_BASE_URL is deprecated. Prefer VITE_API_URL.");
}

const resolvedApiBaseUrl = configuredApiBaseUrl || "http://localhost:3000";

const api = axios.create({
  baseURL: resolvedApiBaseUrl,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((requestConfig) => {
  const token = window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);

  if (token) {
    requestConfig.headers = requestConfig.headers || {};
    requestConfig.headers.Authorization = `Bearer ${token}`;
  }

  return requestConfig;
});

api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    const statusCode = error?.response?.status;
    const requestUrl = error?.config?.url || "";
    const isLoginRequest = typeof requestUrl === "string" && requestUrl.includes("/auth/login");

    if (statusCode === 401 && !isLoginRequest) {
      clearAuthStorage();

      if (unauthorizedHandler) {
        unauthorizedHandler();
      }
    }

    return Promise.reject(error);
  },
);

export const setAuthToken = (token) => {
  if (!token) {
    window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
};

export const setAuthUser = (user) => {
  if (!user) {
    window.localStorage.removeItem(AUTH_USER_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(user));
};

export const clearAuthStorage = () => {
  window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  window.localStorage.removeItem(AUTH_USER_STORAGE_KEY);
};

export const setUnauthorizedHandler = (handler) => {
  unauthorizedHandler = typeof handler === "function" ? handler : null;
};

export default api;
