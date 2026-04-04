import { useRef, useState } from "react";
import toast from "react-hot-toast";
import { Link, Navigate, useNavigate } from "react-router-dom";
import PageLayout from "../components/PageLayout.jsx";
import { useAuth } from "../hooks/useAuth.jsx";
import { registerUser } from "../services/authService.js";
import { ROUTES } from "../utils/constants.js";

const EMAIL_FORMAT_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const getValidationErrors = ({ name, email, password }) => {
  const normalizedName = `${name || ""}`.trim();
  const normalizedEmail = `${email || ""}`.trim();
  const normalizedPassword = `${password || ""}`.trim();

  const errors = {
    name: "",
    email: "",
    password: "",
  };

  if (!normalizedName) {
    errors.name = "Name is required.";
  }

  if (!normalizedEmail) {
    errors.email = "Email is required.";
  } else if (!EMAIL_FORMAT_REGEX.test(normalizedEmail)) {
    errors.email = "Enter a valid email address.";
  }

  if (!normalizedPassword) {
    errors.password = "Password is required.";
  } else if (normalizedPassword.length < 6) {
    errors.password = "Password must be at least 6 characters.";
  }

  return errors;
};

const mapRegistrationError = (error) => {
  if (!error?.response) {
    return {
      message: "Unable to reach the server. Check your connection and try again.",
      fieldErrors: null,
    };
  }

  const statusCode = error.response.status;
  const apiMessage = `${error?.response?.data?.error || ""}`.trim();
  const normalizedMessage = apiMessage.toLowerCase();

  if (statusCode === 409) {
    return {
      message: "This email is already registered. Sign in instead.",
      fieldErrors: {
        email: "Email is already registered.",
      },
    };
  }

  if (statusCode === 400) {
    if (normalizedMessage.includes("name")) {
      return {
        message: apiMessage || "Name is required.",
        fieldErrors: {
          name: "Name is required.",
        },
      };
    }

    if (normalizedMessage.includes("email")) {
      const emailMessage = normalizedMessage.includes("required")
        ? "Email is required."
        : "Enter a valid email address.";

      return {
        message: apiMessage || emailMessage,
        fieldErrors: {
          email: emailMessage,
        },
      };
    }

    if (normalizedMessage.includes("password")) {
      const passwordMessage = normalizedMessage.includes("required")
        ? "Password is required."
        : "Password must be at least 6 characters.";

      return {
        message: apiMessage || passwordMessage,
        fieldErrors: {
          password: passwordMessage,
        },
      };
    }

    return {
      message: apiMessage || "Please check your details and try again.",
      fieldErrors: null,
    };
  }

  if (statusCode >= 500) {
    return {
      message: "Registration is temporarily unavailable. Please try again.",
      fieldErrors: null,
    };
  }

  return {
    message: apiMessage || "Could not create your account. Please try again.",
    fieldErrors: null,
  };
};

function Register() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [formState, setFormState] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [fieldErrors, setFieldErrors] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [statusMessage, setStatusMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitGuardRef = useRef(false);

  if (isAuthenticated) {
    return <Navigate to={ROUTES.dashboard} replace />;
  }

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

    if (submitGuardRef.current || isSubmitting) {
      return;
    }

    const validationErrors = getValidationErrors(formState);
    setFieldErrors(validationErrors);

    const firstValidationError = validationErrors.name || validationErrors.email || validationErrors.password;

    if (firstValidationError) {
      setStatusMessage(firstValidationError);
      toast.error(firstValidationError);
      return;
    }

    const payload = {
      name: formState.name.trim(),
      email: formState.email.trim(),
      password: formState.password.trim(),
    };

    submitGuardRef.current = true;
    setIsSubmitting(true);
    setStatusMessage("");

    try {
      await registerUser(payload);
      const successMessage = "Account created successfully. Please sign in to continue.";

      setStatusMessage(successMessage);
      toast.success(successMessage);
      navigate(ROUTES.login, {
        replace: true,
      });
    } catch (error) {
      const mappedError = mapRegistrationError(error);

      if (mappedError.fieldErrors) {
        setFieldErrors((previous) => {
          return {
            ...previous,
            ...mappedError.fieldErrors,
          };
        });
      }

      setStatusMessage(mappedError.message);
      toast.error(mappedError.message);
    } finally {
      submitGuardRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <PageLayout
      title="Create Account"
      description="Register with your name, email, and password. After signup, log in to start using Zorvyn."
    >
      <form onSubmit={onSubmit} className="grid gap-5 md:max-w-lg">
        <label className="grid gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
          Name
          <input
            name="name"
            type="text"
            value={formState.name}
            onChange={onChange}
            disabled={isSubmitting}
            aria-invalid={Boolean(fieldErrors.name)}
            className="rounded-xl border border-slate-300 bg-white/85 px-3 py-2 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400 disabled:cursor-not-allowed disabled:opacity-70 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-100 dark:placeholder:text-slate-500"
            required
          />
          {fieldErrors.name && <span className="text-xs text-rose-600 dark:text-rose-300">{fieldErrors.name}</span>}
        </label>

        <label className="grid gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
          Email
          <input
            name="email"
            type="email"
            value={formState.email}
            onChange={onChange}
            disabled={isSubmitting}
            aria-invalid={Boolean(fieldErrors.email)}
            className="rounded-xl border border-slate-300 bg-white/85 px-3 py-2 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400 disabled:cursor-not-allowed disabled:opacity-70 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-100 dark:placeholder:text-slate-500"
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
            disabled={isSubmitting}
            aria-invalid={Boolean(fieldErrors.password)}
            className="rounded-xl border border-slate-300 bg-white/85 px-3 py-2 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400 disabled:cursor-not-allowed disabled:opacity-70 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-100 dark:placeholder:text-slate-500"
            required
          />
          {fieldErrors.password && (
            <span className="text-xs text-rose-600 dark:text-rose-300">{fieldErrors.password}</span>
          )}
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-700 border-r-transparent" />}
            {isSubmitting ? "Creating account..." : "Create account"}
          </button>
        </div>
      </form>

      {statusMessage && <p className="mt-4 text-sm text-slate-700 dark:text-slate-200">{statusMessage}</p>}

      <p className="mt-5 text-sm text-slate-600 dark:text-slate-300">
        Already registered?{" "}
        <Link
          to={ROUTES.login}
          className="font-semibold text-cyan-700 underline decoration-cyan-500 underline-offset-2 transition hover:text-cyan-600 dark:text-cyan-300 dark:hover:text-cyan-200"
        >
          Sign in
        </Link>
        .
      </p>
    </PageLayout>
  );
}

export default Register;
