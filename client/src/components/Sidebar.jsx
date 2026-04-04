import { NavLink } from "react-router-dom";
import { ROUTES } from "../utils/constants.js";

const navigationLinks = [
  {
    to: ROUTES.dashboard,
    label: "Dashboard",
    badge: "01",
  },
  {
    to: ROUTES.records,
    label: "Records",
    badge: "02",
  },
  {
    to: ROUTES.login,
    label: "Login",
    badge: "03",
  },
];

const navLinkClass = ({ isActive }) => {
  if (isActive) {
    return "group flex items-center justify-between rounded-2xl border border-cyan-300/70 bg-cyan-300/90 px-4 py-3 text-sm font-semibold text-slate-900 shadow-sm transition dark:border-cyan-300/20 dark:bg-cyan-300 dark:text-slate-950";
  }

  return "group flex items-center justify-between rounded-2xl border border-transparent px-4 py-3 text-sm font-medium text-slate-600 transition hover:border-slate-200 hover:bg-white hover:text-slate-900 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:bg-slate-900 dark:hover:text-white";
};

function Sidebar({ className = "", onNavigate }) {
  return (
    <aside className={className}>
      <div className="flex h-full flex-col">
        <div className="rounded-3xl border border-slate-200/90 bg-white/80 p-5 backdrop-blur dark:border-slate-700 dark:bg-slate-900/80">
          <p className="text-xs font-semibold uppercase tracking-[0.26em] text-cyan-700 dark:text-cyan-300">Zorvyn</p>
          <h1 className="mt-2 text-xl font-semibold text-slate-900 dark:text-slate-100">Finance Console</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">A focused workspace for daily records and analytics.</p>
        </div>

        <nav className="mt-6 grid gap-2">
          {navigationLinks.map((link) => (
            <NavLink key={link.to} to={link.to} onClick={onNavigate} className={navLinkClass}>
              <span>{link.label}</span>
              <span className="font-mono text-xs tracking-widest text-slate-500 group-hover:text-slate-800 dark:text-slate-400 dark:group-hover:text-slate-200">
                {link.badge}
              </span>
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto rounded-3xl border border-slate-200/90 bg-white/75 p-5 text-sm text-slate-600 backdrop-blur dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300">
          Keep data clean, review trends weekly, and export monthly snapshots.
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
