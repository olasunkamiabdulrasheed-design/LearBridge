import { Link, Outlet } from "react-router-dom";
import { APP_NAME } from "../../config/api";
import { Icon } from "../ui/icons";

/**
 * Focused layout for authentication pages. Keeps a minimal header with the
 * brand and a way back to the public site, but no marketing nav or footer.
 */
export function AuthLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="border-b border-[var(--lb-line)] bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5" aria-label={`${APP_NAME} home`}>
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500 text-base font-bold text-white shadow-sm">
              L
            </span>
            <span className="text-[17px] font-bold tracking-tight text-slate-900">{APP_NAME}</span>
          </Link>
          <Link
            to="/"
            className="ml-auto inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
          >
            <Icon name="arrowLeft" className="h-4 w-4" />
            Back to home
          </Link>
        </div>
      </header>
      <div className="flex flex-1 flex-col">
        <Outlet />
      </div>
    </div>
  );
}
