import { useEffect, useRef, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Records from "./pages/Records.jsx";
import api from "./services/api.js";
import { ROUTES } from "./utils/constants.js";

const WARMUP_TIMEOUT_MS = 30000;
const MAX_WARMUP_ATTEMPTS = 2;
const RETRY_DELAY_MS = 1500;

const delay = (ms) => {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
};

function App() {
  const warmupStartedRef = useRef(false);
  const [isWarmingUp, setIsWarmingUp] = useState(true);
  const [warmupAttempt, setWarmupAttempt] = useState(1);
  const [showWarmupNotice, setShowWarmupNotice] = useState(false);

  useEffect(() => {
    if (warmupStartedRef.current) {
      return;
    }

    warmupStartedRef.current = true;
    let isCancelled = false;

    const warmupBackend = async () => {
      for (let attempt = 1; attempt <= MAX_WARMUP_ATTEMPTS; attempt += 1) {
        if (isCancelled) {
          return;
        }

        setWarmupAttempt(attempt);

        try {
          await api.get("/health", {
            timeout: WARMUP_TIMEOUT_MS,
          });

          if (!isCancelled) {
            setIsWarmingUp(false);
            setShowWarmupNotice(false);
          }

          return;
        } catch {
          if (attempt < MAX_WARMUP_ATTEMPTS) {
            await delay(RETRY_DELAY_MS);
            continue;
          }

          if (!isCancelled) {
            setIsWarmingUp(false);
            setShowWarmupNotice(true);
          }
        }
      }
    };

    warmupBackend();

    return () => {
      isCancelled = true;
    };
  }, []);

  if (isWarmingUp) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
        <section className="w-full max-w-xl rounded-3xl border border-slate-200/80 bg-white/85 p-6 shadow-panel backdrop-blur dark:border-slate-800 dark:bg-slate-900/70 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-700 dark:text-cyan-300">
            Service Warmup
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
            Waking backend server...
          </h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            First load may take a little longer on free-tier hosting. Please wait while we connect.
          </p>

          <div className="mt-5 inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/90 px-4 py-2 text-sm font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-cyan-600 border-r-transparent dark:border-cyan-300" />
            Attempt {warmupAttempt} of {MAX_WARMUP_ATTEMPTS}
          </div>
        </section>
      </div>
    );
  }

  return (
    <>
      {showWarmupNotice && (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
          Backend is still waking up. Initial requests may briefly fail, then succeed.
        </div>
      )}

      <Routes>
        <Route path="/" element={<Navigate to={ROUTES.login} replace />} />
        <Route path={ROUTES.login} element={<Login />} />
        <Route path={ROUTES.register} element={<Register />} />
        <Route
          path={ROUTES.dashboard}
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.records}
          element={
            <ProtectedRoute>
              <Records />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to={ROUTES.login} replace />} />
      </Routes>
    </>
  );
}

export default App;
