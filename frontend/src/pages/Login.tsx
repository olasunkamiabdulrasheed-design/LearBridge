import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, PageHeader } from "../components/layout/Page";
import { Button, Field, TextInput } from "../components/ui/controls";
import { Icon } from "../components/ui/icons";
import { ErrorState } from "../components/ui/States";
import { useAuth } from "../context/AuthContext";

const JOURNEY = [
  { title: "Diagnose", text: "Take short assessments that reveal exactly where you stand." },
  { title: "Plan", text: "Get a personal study path built from your real gaps." },
  { title: "Improve", text: "Study, re-assess, and watch the gaps close." },
];

export function LoginPage() {
  const { login, register, authError } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setLocalError(null);
    try {
      if (mode === "login") {
        await login(username.trim(), password);
      } else {
        await register(username.trim(), email.trim(), password);
      }
      navigate("/");
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Authentication failed.");
    } finally {
      setBusy(false);
    }
  }

  const error = localError ?? authError;

  return (
    <div>
      <PageHeader
        eyebrow="Welcome"
        title={mode === "login" ? "Sign in to LearnBridge" : "Create your account"}
        subtitle="Your personal learning companion — diagnostics, plans, and measurable progress."
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="lb-card flex flex-col justify-center bg-slate-900 text-white" style={{ borderColor: "#0f1f3d" }}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-300">
            How it works
          </p>
          <ol className="mt-4 space-y-5">
            {JOURNEY.map((step, i) => (
              <li key={step.title} className="flex gap-4">
                <span
                  aria-hidden="true"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-sm font-bold"
                >
                  {i + 1}
                </span>
                <div>
                  <p className="text-[15px] font-semibold">{step.title}</p>
                  <p className="mt-0.5 text-sm leading-relaxed text-slate-300">{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <Card
          title={mode === "login" ? "Sign in" : "Create account"}
          description={
            mode === "login"
              ? "Welcome back — pick up right where you left off."
              : "Start with a username, email, and password."
          }
        >
          <div className="mb-5 inline-flex rounded-lg bg-slate-100 p-1" role="tablist" aria-label="Authentication mode">
            {(["login", "register"] as const).map((m) => (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={mode === m}
                onClick={() => {
                  setMode(m);
                  setLocalError(null);
                }}
                className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                  mode === m ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {m === "login" ? "Sign in" : "Register"}
              </button>
            ))}
          </div>
          {error && (
            <div className="mb-4">
              <ErrorState message={error} />
            </div>
          )}
          <form className="max-w-md space-y-4" onSubmit={(e) => void onSubmit(e)}>
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
            {mode === "register" && (
              <Field label="Email">
                <TextInput
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                />
              </Field>
            )}
            <Field
              label="Password"
              hint={mode === "register" ? "At least 8 characters." : undefined}
            >
              <div className="relative">
                <TextInput
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
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
            <Button type="submit" disabled={busy} className="w-full sm:w-auto sm:min-w-44">
              {busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
