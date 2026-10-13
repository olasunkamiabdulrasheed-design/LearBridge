import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Button, Field, TextInput } from "../components/ui/controls";
import { Icon, type IconName } from "../components/ui/icons";
import { ErrorState } from "../components/ui/States";
import { useAuth } from "../context/AuthContext";

const JOURNEY: { icon: IconName; title: string; text: string }[] = [
  { icon: "assessment", title: "Diagnose", text: "Short assessments reveal exactly where you stand." },
  { icon: "agent", title: "Plan", text: "A personal study path built from your real gaps." },
  { icon: "progress", title: "Improve", text: "Study, re-assess, and watch the gaps close." },
];

export function LoginPage() {
  const { login, authError, isAuthenticated, initializing } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  if (!initializing && isAuthenticated) return <Navigate to="/dashboard" replace />;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setLocalError(null);
    try {
      await login(username.trim(), password);
      navigate("/dashboard");
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Authentication failed.");
    } finally {
      setBusy(false);
    }
  }

  const error = localError ?? authError;

  return (
    <main className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-12 px-4 py-12 sm:px-6 lg:grid-cols-2">
        <div className="hidden lg:block">
          <p className="lb-eyebrow">Welcome back</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            Pick up right where you left off.
          </h1>
          <p className="mt-3 max-w-md text-slate-600">
            Sign in to continue your diagnostics, study plans, and progress.
          </p>
          <ol className="mt-8 space-y-5">
            {JOURNEY.map((step) => (
              <li key={step.title} className="flex gap-4">
                <span
                  aria-hidden="true"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600"
                >
                  <Icon name={step.icon} className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-[15px] font-semibold text-slate-900">{step.title}</p>
                  <p className="mt-0.5 text-sm leading-relaxed text-slate-600">{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div className="mx-auto w-full max-w-md">
          <div className="lb-card">
            <h2 className="text-xl font-bold tracking-tight text-slate-900">Sign in</h2>
            <p className="mt-1 text-sm text-slate-600">
              Enter your username and password to access your account.
            </p>
            {error && (
              <div className="mt-4">
                <ErrorState message={error} />
              </div>
            )}
            <form className="mt-5 space-y-4" onSubmit={(e) => void onSubmit(e)}>
              <Field label="Username">
                <TextInput
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoComplete="username"
                  placeholder="e.g. ada_lovelace"
                />
              </Field>
              <Field label="Password">
                <div className="relative">
                  <TextInput
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-pressed={showPassword}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute inset-y-0 right-0 flex items-center gap-1.5 px-3 text-sm font-medium text-brand-600 hover:underline"
                  >
                    <Icon name={showPassword ? "eyeOff" : "eye"} className="h-4 w-4" />
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </Field>
              <Button type="submit" disabled={busy} className="w-full">
                {busy ? "Please wait…" : "Sign in"}
              </Button>
            </form>
            <p className="mt-5 text-sm text-slate-600">
              Don&apos;t have an account?{" "}
              <Link to="/register" className="font-medium text-brand-600 hover:underline">
                Create one
              </Link>
            </p>
          </div>
        </div>
      </main>
  );
}
