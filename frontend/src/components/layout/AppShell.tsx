import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { APP_NAME } from "../../config/api";
import { useAuth } from "../../context/AuthContext";

const NAV = [
  { to: "/", label: "Dashboard", end: true },
  { to: "/assessment", label: "Assessment" },
  { to: "/agent", label: "Study Agent" },
  { to: "/plan", label: "Learning Plan" },
  { to: "/resources", label: "Resources" },
  { to: "/progress", label: "Progress" },
];

function linkClass(active: boolean): string {
  return active
    ? "bg-brand-50 text-brand-700 font-semibold"
    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900";
}

export function Navbar({ onMenuToggle }: { onMenuToggle: () => void }) {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6">
        <button
          type="button"
          onClick={onMenuToggle}
          className="rounded-md p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
          aria-label="Toggle navigation"
        >
          ☰
        </button>
        <Link to="/" className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500 text-lg font-bold text-white">
            L
          </span>
          <span className="text-lg font-bold tracking-tight">{APP_NAME}</span>
        </Link>
        <span className="ml-2 hidden rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 sm:inline">
          Education · Hackathon build
        </span>
        <div className="ml-auto flex items-center gap-3">
          {isAuthenticated ? (
            <>
              <span className="hidden text-sm text-slate-600 sm:inline">{user?.username}</span>
              <button
                type="button"
                onClick={() => {
                  logout();
                  navigate("/login");
                }}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                Sign out
              </button>
            </>
          ) : (
            <Link
              to="/login"
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
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
  return (
    <aside
      className={`fixed inset-y-0 left-0 z-20 w-64 transform border-r border-slate-200 bg-white pt-16 transition-transform lg:static lg:z-auto lg:translate-x-0 lg:pt-0 ${
        open ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      <nav className="space-y-1 p-4">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) =>
              `block rounded-md px-3 py-2 text-sm ${linkClass(isActive)}`
            }
          >
            {item.label}
          </NavLink>
        ))}
        <div className="pt-4">
          <p className="px-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Account</p>
          <NavLink
            to="/login"
            onClick={onNavigate}
            className={({ isActive }) =>
              `mt-1 block rounded-md px-3 py-2 text-sm ${linkClass(isActive)}`
            }
          >
            Login
          </NavLink>
        </div>
      </nav>
    </aside>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className="min-h-screen">
      <Navbar onMenuToggle={() => setMenuOpen((v) => !v)} />
      <div className="mx-auto flex max-w-7xl">
        <Sidebar open={menuOpen} onNavigate={() => setMenuOpen(false)} />
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
