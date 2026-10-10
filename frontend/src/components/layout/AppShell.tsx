import { useEffect, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { APP_NAME } from "../../config/api";
import { useAuth } from "../../context/AuthContext";
import { Icon, type IconName } from "../ui/icons";

const NAV: Array<{ to: string; label: string; hint: string; icon: IconName; end?: boolean }> = [
  { to: "/", label: "Dashboard", hint: "Overview", icon: "dashboard", end: true },
  { to: "/assessment", label: "Assessments", hint: "Take diagnostics", icon: "assessment" },
  { to: "/agent", label: "Study Agent", hint: "Get recommendations", icon: "agent" },
  { to: "/plan", label: "Learning Plan", hint: "Follow your path", icon: "plan" },
  { to: "/resources", label: "Resources", hint: "Study material", icon: "resources" },
  { to: "/progress", label: "Progress", hint: "Track improvement", icon: "progress" },
];

export function Navbar({ onMenuToggle }: { onMenuToggle: () => void }) {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const initial = (user?.username ?? "?").slice(0, 1).toUpperCase();
  return (
    <header className="sticky top-0 z-30 border-b bg-white/90 backdrop-blur" style={{ borderColor: "var(--lb-line)" }}>
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6">
        <button
          type="button"
          onClick={onMenuToggle}
          className="rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-100 lg:hidden"
          aria-label="Open navigation"
        >
          <Icon name="menu" className="h-5 w-5" />
        </button>
        <Link to="/" className="flex items-center gap-2.5" aria-label={`${APP_NAME} home`}>
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500 text-base font-bold text-white shadow-sm">
            L
          </span>
          <span className="text-[17px] font-bold tracking-tight text-slate-900">{APP_NAME}</span>
        </Link>
        <span className="ml-1 hidden rounded-md bg-brand-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-brand-700 sm:inline">
          Beta
        </span>
        <div className="ml-auto flex items-center gap-3">
          {isAuthenticated ? (
            <>
              <span
                aria-hidden="true"
                className="hidden h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-[13px] font-semibold text-white sm:flex"
              >
                {initial}
              </span>
              <span className="hidden max-w-32 truncate text-sm text-slate-600 md:inline">
                {user?.username}
              </span>
              <button
                type="button"
                onClick={() => {
                  logout();
                  navigate("/login");
                }}
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
              >
                <Icon name="logout" className="h-4 w-4" />
                Sign out
              </button>
            </>
          ) : (
            <Link
              to="/login"
              className="inline-flex h-9 items-center rounded-lg bg-slate-900 px-4 text-sm font-medium text-white shadow-sm transition-colors hover:bg-slate-700"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

export function Sidebar({ open, onNavigate }: { open: boolean; onNavigate: () => void }) {
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onNavigate();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onNavigate]);

  return (
    <>
      {open && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={onNavigate}
          className="fixed inset-0 z-10 bg-slate-900/40 lg:hidden"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-20 w-[260px] transform border-r bg-white pt-16 transition-transform lg:static lg:z-auto lg:translate-x-0 lg:pt-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ borderColor: "var(--lb-line)" }}
      >
        <nav aria-label="Primary" className="space-y-6 p-4">
          <div>
            <p className="lb-eyebrow px-3 pb-2">Your journey</p>
            <ol className="space-y-1">
              {NAV.map((item, i) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      `group flex items-center gap-3 rounded-lg border px-3 py-2 text-sm transition-colors ${
                        isActive
                          ? "border-brand-600/20 bg-brand-50 font-semibold text-brand-700"
                          : "border-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                      }`
                    }
                  >
                    <span
                      aria-hidden="true"
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-500 transition-colors group-aria-[current=page]:bg-brand-500 group-aria-[current=page]:text-white"
                    >
                      <Icon name={item.icon} className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate leading-tight">
                        <span className="mr-1.5 text-[11px] font-semibold text-slate-400">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        {item.label}
                      </span>
                      <span className="block truncate text-xs font-normal text-slate-500">
                        {item.hint}
                      </span>
                    </span>
                  </NavLink>
                </li>
              ))}
            </ol>
          </div>
          {!isAuthenticated && (
            <div>
              <p className="lb-eyebrow px-3 pb-2">Account</p>
              <NavLink
                to="/login"
                onClick={onNavigate}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                    isActive
                      ? "bg-brand-50 font-semibold text-brand-700"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`
                }
              >
                <Icon name="login" className="h-4 w-4" />
                Sign in
              </NavLink>
            </div>
          )}
        </nav>
      </aside>
    </>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className="min-h-screen">
      <Navbar onMenuToggle={() => setMenuOpen((v) => !v)} />
      <div className="mx-auto flex max-w-7xl">
        <Sidebar open={menuOpen} onNavigate={() => setMenuOpen(false)} />
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
