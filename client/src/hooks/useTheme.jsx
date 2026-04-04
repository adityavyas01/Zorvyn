import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { THEME_MODES, THEME_STORAGE_KEY } from "../utils/constants.js";

const ThemeContext = createContext(null);

const isDarkModePreferred = () => {
  if (typeof window === "undefined") {
    return false;
  }

  return window.matchMedia?.("(prefers-color-scheme: dark)").matches || false;
};

const getInitialTheme = () => {
  if (typeof window === "undefined") {
    return THEME_MODES.light;
  }

  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);

  if (storedTheme === THEME_MODES.dark || storedTheme === THEME_MODES.light) {
    return storedTheme;
  }

  return isDarkModePreferred() ? THEME_MODES.dark : THEME_MODES.light;
};

const applyThemeClass = (theme) => {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.classList.toggle("dark", theme === THEME_MODES.dark);
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    const initialTheme = getInitialTheme();
    applyThemeClass(initialTheme);
    return initialTheme;
  });

  useEffect(() => {
    applyThemeClass(theme);
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const value = useMemo(() => {
    const isDarkMode = theme === THEME_MODES.dark;

    return {
      theme,
      isDarkMode,
      setTheme,
      toggleTheme: () => {
        setTheme(isDarkMode ? THEME_MODES.light : THEME_MODES.dark);
      },
    };
  }, [theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider.");
  }

  return context;
};
