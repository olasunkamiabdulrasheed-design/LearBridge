import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { APP_NAME } from "../../config/api";
import { Icon } from "../ui/icons";

/** Shared primary/secondary CTA styles used across all public pages. */
export const primaryLinkClass =
  "inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-brand-500 px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-600";
export const secondaryLinkClass =
  "inline-flex h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50";

export function PrimaryLink({
  to,
  children,
  className = "",
}: {
  to: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link to={to} className={`${primaryLinkClass} ${className}`}>
      {children}
    </Link>
  );
}

export function SecondaryLink({
  to,
  children,
  className = "",
}: {
  to: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link to={to} className={`${secondaryLinkClass} ${className}`}>
      {children}
    </Link>
  );
}

export function Brand() {
  return (
    <Link to="/" className="flex items-center gap-2.5" aria-label={`${APP_NAME} home`}>
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500 text-base font-bold text-white shadow-sm">
        L
      </span>
      <span className="text-[17px] font-bold tracking-tight text-slate-900">{APP_NAME}</span>
    </Link>
  );
}

const PUBLIC_NAV: { to: string; label: string; end?: boolean }[] = [
  { to: "/", label: "Home", end: true },
  { to: "/how-it-works", label: "How It Works" },
  { to: "/features", label: "Features" },
  { to: "/about", label: "About" },
  { to: "/faq", label: "FAQ" },
];

export function MarketingNav() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const desktopLink = ({ isActive }: { isActive: boolean }) =>
    `rounded-md px-3 py-2 text-sm font-medium transition-colors ${
      isActive ? "text-brand-600" : "text-slate-600 hover:text-slate-900"
    }`;

  const mobileLink = ({ isActive }: { isActive: boolean }) =>
    `rounded-md px-3 py-2 text-sm font-medium ${
      isActive ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-100"
    }`;

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--lb-line)] bg-white/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Brand />
        <nav className="ml-4 hidden items-center gap-1 lg:flex" aria-label="Primary">
          {PUBLIC_NAV.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={desktopLink}>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="ml-auto hidden items-center gap-3 lg:flex">
          <Link
            to="/login"
            className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
          >
            Log in
          </Link>
          <Link
            to="/register"
            className="inline-flex h-9 items-center rounded-lg bg-brand-500 px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-600"
          >
            Get Started
          </Link>
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="ml-auto rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-100 lg:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls="public-mobile-nav"
        >
          <Icon name={open ? "close" : "menu"} className="h-5 w-5" />
        </button>
      </div>

      {open && (
        <div id="public-mobile-nav" className="border-t border-[var(--lb-line)] bg-white lg:hidden">
          <nav className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3 sm:px-6" aria-label="Mobile">
            {PUBLIC_NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setOpen(false)}
                className={mobileLink}
              >
                {item.label}
              </NavLink>
            ))}
            <div className="mt-2 flex flex-col gap-2 border-t border-[var(--lb-line)] pt-3">
              <Link
                to="/login"
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                Log in
              </Link>
              <Link
                to="/register"
                onClick={() => setOpen(false)}
                className="inline-flex h-10 items-center justify-center rounded-lg bg-brand-500 px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-600"
              >
                Get Started
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

export function MarketingFooter() {
  return (
    <footer className="border-t border-[var(--lb-line)] bg-white">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-4">
          <div className="sm:col-span-2 md:col-span-1">
            <Brand />
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-slate-600">
              A guided path from diagnosing learning gaps to measuring real improvement.
            </p>
          </div>
          <div>
            <p className="lb-eyebrow">Product</p>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <Link to="/how-it-works" className="text-slate-600 transition-colors hover:text-slate-900">
                  How It Works
                </Link>
              </li>
              <li>
                <Link to="/features" className="text-slate-600 transition-colors hover:text-slate-900">
                  Features
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="lb-eyebrow">Learn</p>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <Link to="/about" className="text-slate-600 transition-colors hover:text-slate-900">
                  About
                </Link>
              </li>
              <li>
                <Link to="/faq" className="text-slate-600 transition-colors hover:text-slate-900">
                  FAQ
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="lb-eyebrow">Account</p>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <Link to="/login" className="text-slate-600 transition-colors hover:text-slate-900">
                  Log in
                </Link>
              </li>
              <li>
                <Link to="/register" className="text-slate-600 transition-colors hover:text-slate-900">
                  Get started
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-10 border-t border-[var(--lb-line)] pt-6">
          <p className="text-xs text-slate-500">
            © {new Date().getFullYear()} {APP_NAME}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

/** Consistent intro band for public information pages. */
export function PageHero({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <section className="border-b border-[var(--lb-line)] bg-gradient-to-b from-brand-50 to-white">
      <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 sm:py-20">
        <p className="lb-eyebrow">{eyebrow}</p>
        <h1 className="mt-2 text-3xl font-bold leading-tight tracking-tight text-slate-900 sm:text-4xl">
          {title}
        </h1>
        {children && (
          <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-slate-600">{children}</p>
        )}
      </div>
    </section>
  );
}

/**
 * Layout for public marketing pages. Provides consistent navigation and footer
 * and intentionally renders no learner sidebar. Auth pages use AuthLayout.
 */
export function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <MarketingNav />
      <main className="flex-1">
        <Outlet />
      </main>
      <MarketingFooter />
    </div>
  );
}
