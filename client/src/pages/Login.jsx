import { useState } from "react";
import toast from "react-hot-toast";
import { Link, useNavigate } from "react-router-dom";
import PageLayout from "../components/PageLayout.jsx";
import { useAuth } from "../hooks/useAuth.jsx";
import { loginUser } from "../services/authService.js";
import { ROUTES } from "../utils/constants.js";

const getValidationErrors = ({ email, password }) => {
  const errors = {
    email: "",
    password: "",
  };

  if (!email.trim()) {
    errors.email = "Email is required.";
  } else if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
    errors.email = "Enter a valid email address.";
  }

  if (!password.trim()) {
    errors.password = "Password is required.";
  }

  return errors;
};

function Login() {
  const navigate = useNavigate();
  const { saveSession, isAuthenticated, logout, user } = useAuth();
  const [formState, setFormState] = useState({
    email: "analyst.demo@zorvyn.local",
    password: "AnalystDemo123!",
  });
  const [fieldErrors, setFieldErrors] = useState({
    email: "",
    password: "",
  });
  const [statusMessage, setStatusMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onChange = (event) => {
    const { name, value } = event.target;

    setFormState((previous) => {
      return {
        ...previous,
        [name]: value,
      };
    });

    setFieldErrors((previous) => {
      return {
        ...previous,
        [name]: "",
      };
    });

    if (statusMessage) {
      setStatusMessage("");
    }
  };

  const onSubmit = async (event) => {
    event.preventDefault();

    const validationErrors = getValidationErrors(formState);
    setFieldErrors(validationErrors);

    const firstValidationError = validationErrors.email || validationErrors.password;

    if (firstValidationError) {
      setStatusMessage(firstValidationError);
      toast.error(firstValidationError);
      return;
    }

    setIsSubmitting(true);
    setStatusMessage("");

    try {
      const authResult = await loginUser(formState);

      if (!authResult.token) {
        throw new Error("Login response did not include a token.");
      }

      saveSession(authResult);
      setStatusMessage("Login successful. Redirecting to dashboard.");
      toast.success("Logged in successfully.");
      navigate(ROUTES.dashboard, {
        replace: true,
      });
    } catch (error) {
      const message = error?.response?.data?.error || "Login failed. Check credentials and backend status.";
      setStatusMessage(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PageLayout
      title="Login"
      description="Placeholder login page wired to backend auth API for frontend bootstrapping."
    >
      <form onSubmit={onSubmit} className="grid gap-5 md:max-w-lg">
        <label className="grid gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
          Email
          <input
            name="email"
            type="email"
            value={formState.email}
            onChange={onChange}
            aria-invalid={Boolean(fieldErrors.email)}
            className="rounded-xl border border-slate-300 bg-white/85 px-3 py-2 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-100 dark:placeholder:text-slate-500"
            required
          />
          {fieldErrors.email && <span className="text-xs text-rose-600 dark:text-rose-300">{fieldErrors.email}</span>}
        </label>

        <label className="grid gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
          Password
          <input
            name="password"
            type="password"
            value={formState.password}
            onChange={onChange}
            aria-invalid={Boolean(fieldErrors.password)}
            className="rounded-xl border border-slate-300 bg-white/85 px-3 py-2 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-100 dark:placeholder:text-slate-500"
            required
          />
          {fieldErrors.password && <span className="text-xs text-rose-600 dark:text-rose-300">{fieldErrors.password}</span>}
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-700 border-r-transparent" />}
            {isSubmitting ? "Signing in..." : "Sign in"}
          </button>
          {isAuthenticated && (
            <button
              type="button"
              onClick={() => {
                logout();
              }}
              className="rounded-xl border border-slate-300 bg-white/70 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200"
            >
              Log out{user?.role ? ` (${user.role})` : ""}
            </button>
          )}
        </div>
      </form>

      {statusMessage && <p className="mt-4 text-sm text-slate-700 dark:text-slate-200">{statusMessage}</p>}

      <p className="mt-5 text-sm text-slate-600 dark:text-slate-300">
        Need an account?{" "}
        <Link
          to={ROUTES.register}
          className="font-semibold text-cyan-700 underline decoration-cyan-500 underline-offset-2 transition hover:text-cyan-600 dark:text-cyan-300 dark:hover:text-cyan-200"
        >
          Create one
        </Link>
        .
      </p>
    </PageLayout>
  );
}

export default Login;
