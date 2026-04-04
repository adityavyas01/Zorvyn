import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { clearAuthStorage, setAuthToken, setAuthUser, setUnauthorizedHandler } from "../services/api.js";
import { AUTH_TOKEN_STORAGE_KEY, AUTH_USER_STORAGE_KEY, ROUTES } from "../utils/constants.js";

const AuthContext = createContext(null);
const SUPPORTED_ROLES = new Set(["Viewer", "Analyst", "Admin"]);

const decodeBase64Url = (value) => {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  return window.atob(padded);
};

const parseTokenPayload = (token) => {
  if (!token) {
    return null;
  }

  const parts = token.split(".");

  if (parts.length !== 3) {
    return null;
  }

  try {
    return JSON.parse(decodeBase64Url(parts[1]));
  } catch {
    return null;
  }
};

const getStoredToken = () => {
  return window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) || "";
};

const getStoredUser = () => {
  const serializedUser = window.localStorage.getItem(AUTH_USER_STORAGE_KEY);

  if (!serializedUser) {
    return null;
  }

  try {
    return JSON.parse(serializedUser);
  } catch {
    return null;
  }
};

const getIdentityFromToken = (token) => {
  const payload = parseTokenPayload(token);

  if (!payload) {
    return null;
  }

  const hasUserId = typeof payload.userId === "string" && payload.userId.trim().length > 0;
  const hasRole = typeof payload.role === "string" && SUPPORTED_ROLES.has(payload.role);

  if (!hasUserId && !hasRole) {
    return null;
  }

  return {
    id: hasUserId ? payload.userId : "",
    role: hasRole ? payload.role : "",
  };
};

const normalizeUser = (user, token) => {
  const tokenIdentity = getIdentityFromToken(token);

  if (!user && !tokenIdentity) {
    return null;
  }

  const safeUser = user && typeof user === "object" ? user : {};

  return {
    ...safeUser,
    ...(tokenIdentity?.id
      ? {
          id: tokenIdentity.id,
        }
      : {}),
    ...(tokenIdentity?.role
      ? {
          role: tokenIdentity.role,
        }
      : {}),
  };
};

const getInitialAuthState = () => {
  const token = getStoredToken();
  const user = normalizeUser(getStoredUser(), token);

  return {
    token,
    user,
  };
};

export const AuthProvider = ({ children }) => {
  const navigate = useNavigate();
  const [authState, setAuthState] = useState(getInitialAuthState);

  const saveSession = useCallback(({ token, user }) => {
    const nextToken = token || "";
    const nextUser = normalizeUser(user, nextToken);

    setAuthToken(nextToken);
    setAuthUser(nextUser);

    setAuthState({
      token: nextToken,
      user: nextUser,
    });
  }, []);

  const logout = useCallback(
    ({ redirectToLogin = false } = {}) => {
      clearAuthStorage();
      setAuthState({
        token: "",
        user: null,
      });

      if (redirectToLogin) {
        navigate(ROUTES.login, {
          replace: true,
        });
      }
    },
    [navigate],
  );

  useEffect(() => {
    setUnauthorizedHandler(() => {
      toast.error("Session expired. Please sign in again.", {
        id: "session-expired",
      });

      logout({
        redirectToLogin: true,
      });
    });

    return () => {
      setUnauthorizedHandler(null);
    };
  }, [logout]);

  const contextValue = useMemo(() => {
    const role = authState.user?.role || "";

    return {
      token: authState.token,
      user: authState.user,
      role,
      isViewer: role === "Viewer",
      isAnalyst: role === "Analyst",
      isAdmin: role === "Admin",
      isAuthenticated: Boolean(authState.token),
      saveSession,
      logout,
    };
  }, [authState, logout, saveSession]);

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider.");
  }

  return context;
};
