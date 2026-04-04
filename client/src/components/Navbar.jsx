import { useTheme } from "../hooks/useTheme.jsx";

function Navbar({ title, description, onMenuToggle }) {
  const { isDarkMode, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/75 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/65">
      <div className="flex items-start justify-between gap-4 px-4 py-5 sm:px-6 lg:px-10">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={onMenuToggle}
            className="mt-0.5 inline-flex rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 md:hidden dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-500"
          >
            Menu
          </button>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-700 dark:text-cyan-300">Control Center</p>
            <h2 className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
            <p className="mt-1 max-w-xl text-sm text-slate-600 dark:text-slate-300">{description}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={toggleTheme}
          className="inline-flex min-w-[8rem] flex-col items-start rounded-2xl border border-slate-300 bg-white px-4 py-2 text-left text-slate-700 transition hover:border-slate-400 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-500"
        >
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-700 dark:text-cyan-300">
            Theme
          </span>
          <span className="mt-0.5 text-sm font-semibold">{isDarkMode ? "Dark" : "Light"}</span>
          <span className="text-xs text-slate-500 dark:text-slate-400">Toggle mode</span>
        </button>
      </div>
    </header>
  );
}

export default Navbar;
