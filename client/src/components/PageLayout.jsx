import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import Navbar from "./Navbar.jsx";
import Sidebar from "./Sidebar.jsx";

function PageLayout({ title, description, children }) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setIsMobileSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen text-slate-900 dark:text-slate-100">
      <div className="mx-auto flex min-h-screen w-full max-w-[1500px]">
        <Sidebar className="sticky top-0 hidden h-screen w-72 shrink-0 border-r border-slate-200/80 bg-white/55 px-4 py-6 backdrop-blur md:flex dark:border-slate-800 dark:bg-slate-950/50" />

        <div className="flex min-h-screen flex-1 flex-col">
          <Navbar
            title={title}
            description={description}
            onMenuToggle={() => {
              setIsMobileSidebarOpen((previous) => !previous);
            }}
          />

          <main className="flex-1 px-4 pb-8 pt-6 sm:px-6 lg:px-10">
            <section className="page-reveal rounded-3xl border border-slate-200/80 bg-white/65 p-6 shadow-panel backdrop-blur dark:border-slate-800 dark:bg-slate-900/60 sm:p-8">
              {children}
            </section>
          </main>
        </div>
      </div>

      <div
        onClick={() => {
          setIsMobileSidebarOpen(false);
        }}
        className={`fixed inset-0 z-40 bg-slate-950/45 transition-opacity duration-300 md:hidden ${
          isMobileSidebarOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <Sidebar
        onNavigate={() => {
          setIsMobileSidebarOpen(false);
        }}
        className={`fixed inset-y-0 left-0 z-50 flex w-72 border-r border-slate-200 bg-white/95 px-4 py-6 backdrop-blur transition-transform duration-300 md:hidden dark:border-slate-800 dark:bg-slate-950/95 ${
          isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      />
    </div>
  );
}

export default PageLayout;
