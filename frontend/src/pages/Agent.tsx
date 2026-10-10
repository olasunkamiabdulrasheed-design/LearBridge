import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, PageHeader } from "../components/layout/Page";
import { Button } from "../components/ui/controls";
import { Icon } from "../components/ui/icons";
import { EmptyState, ErrorState, LoadingState } from "../components/ui/States";
import { useAuth } from "../context/AuthContext";
import { apiFetch } from "../services/apiClient";
import type { AgentRun, LearningGap, Paginated } from "../types/domain";

export { StatusBadge } from "../components/ui/StatusBadge";

const KIND_LABELS: Record<string, string> = {
  started: "Agent started",
  gaps_examined: "Examined learning gaps",
  resources_searched: "Researched resources",
  resources_evaluated: "Evaluated resources",
  plan_built: "Built study plan",
  report_written: "Wrote report",
  completed: "Completed",
  failed: "Failed",
  note: "Note",
};

export function AgentPage() {
  const { isAuthenticated, initializing } = useAuth();
  const [gaps, setGaps] = useState<LearningGap[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [activeRun, setActiveRun] = useState<AgentRun | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [gapPage, runPage] = await Promise.all([
        apiFetch<Paginated<LearningGap>>("/gaps/?status=open&page_size=100"),
        apiFetch<Paginated<AgentRun>>("/agent-runs/?page_size=20"),
      ]);
      setGaps(gapPage.results);
      setRuns(runPage.results);
      setSelected(gapPage.results.map((g) => g.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load agent data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!initializing && isAuthenticated) void load();
  }, [initializing, isAuthenticated, load]);

  async function startRun() {
    setStarting(true);
    setStartError(null);
    try {
      const run = await apiFetch<AgentRun>("/agent-runs/", {
        method: "POST",
        body: JSON.stringify({ purpose: "remediate_gaps", gap_ids: selected }),
      });
      setActiveRun(run);
      const runPage = await apiFetch<Paginated<AgentRun>>("/agent-runs/?page_size=20");
      setRuns(runPage.results);
    } catch (e) {
      setStartError(e instanceof Error ? e.message : "Could not start agent run.");
    } finally {
      setStarting(false);
    }
  }

  function toggle(id: number) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  if (initializing) return <LoadingState label="Restoring session…" />;
  if (!isAuthenticated) {
    return (
      <div>
        <PageHeader eyebrow="Assistant" title="Study Agent" subtitle="Sign in to get AI study help." />
        <Card title="Sign in required">
          <Link
            to="/login"
            className="inline-flex h-10 items-center rounded-lg bg-brand-500 px-4 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-600"
          >
            Go to sign in
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        eyebrow="Assistant"
        title="Study Agent"
        subtitle="Tell it which gaps to work on — it researches material and builds your plan."
      />
      {loading && <LoadingState label="Loading gaps and runs…" />}
      {!loading && error && <ErrorState message={error} onRetry={() => void load()} />}
      {!loading && !error && (
        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <div className="space-y-4">
            <Card
              title="What should I work on?"
              description="Select the gaps to address (all open by default)."
            >
              {gaps.length === 0 ? (
                <>
                  <EmptyState title="No open gaps" hint="Take an assessment to identify areas to work on." />
                  <Link
                    to="/assessment"
                    className="mt-3 inline-flex h-10 items-center gap-2 rounded-lg bg-brand-500 px-4 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-600"
                  >
                    Take an assessment
                    <Icon name="arrowRight" className="h-4 w-4" />
                  </Link>
                </>
              ) : (
                <>
                  <fieldset>
                    <legend className="sr-only">Gaps to address</legend>
                    <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                      {gaps.map((g) => (
                        <li key={g.id}>
                          <label className="flex cursor-pointer items-center gap-3 px-3.5 py-2.5 text-sm transition-colors hover:bg-slate-50">
                            <input
                              type="checkbox"
                              checked={selected.includes(g.id)}
                              onChange={() => toggle(g.id)}
                              className="h-4 w-4 shrink-0 accent-[#2f5bff]"
                            />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate font-medium text-slate-900">
                                {g.subject} / {g.topic}
                              </span>
                              <span className="block text-xs capitalize text-slate-500">{g.severity} priority</span>
                            </span>
                          </label>
                        </li>
                      ))}
                    </ul>
                  </fieldset>
                  {startError && (
                    <div className="mt-3">
                      <ErrorState message={startError} />
                    </div>
                  )}
                  <Button onClick={() => void startRun()} disabled={starting || selected.length === 0} className="mt-4 w-full">
                    {starting ? (
                      <>Working — researching and planning…</>
                    ) : (
                      <>
                        <Icon name="agent" className="h-4 w-4" />
                        Build my study plan ({selected.length})
                      </>
                    )}
                  </Button>
                  <p className="mt-2 text-xs leading-relaxed text-slate-500">
                    Runs usually take under a minute. Results stay on this page.
                  </p>
                </>
              )}
            </Card>

            <Card title="Past runs" description="Every run keeps its observable step history.">
              {runs.length === 0 ? (
                <EmptyState title="No runs yet" hint="Your completed runs will appear here." />
              ) : (
                <ul className="max-h-72 space-y-1 overflow-y-auto pr-1">
                  {runs.map((r) => (
                    <li key={r.id}>
                      <button
                        type="button"
                        onClick={() => setActiveRun(r)}
                        aria-pressed={activeRun?.id === r.id}
                        className={`flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                          activeRun?.id === r.id
                            ? "border-brand-500 bg-brand-50 font-medium"
                            : "border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        <span className="truncate">
                          Run #{r.id} · {r.purpose.replace(/_/g, " ")}
                        </span>
                        <RunStatus status={r.status} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          <div className="lg:sticky lg:top-20">
            {activeRun ? (
              <RunDetail run={activeRun} gaps={gaps} />
            ) : (
              <Card title="Run activity" description="Select a past run, or start a new one to see each step here.">
                <EmptyState title="Nothing selected" hint="Agent steps, results, and plan links appear in this panel." />
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function RunStatus({ status }: { status: string }) {
  const dot =
    status === "succeeded"
      ? "bg-emerald-500"
      : status === "failed"
        ? "bg-red-500"
        : status === "running"
          ? "bg-brand-500 animate-pulse"
          : "bg-slate-300";
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 text-xs font-medium text-slate-600">
      <span aria-hidden="true" className={`h-2 w-2 rounded-full ${dot}`} />
      {status.replace(/_/g, " ")}
    </span>
  );
}

function gapIdsFromRun(run: AgentRun): number[] {
  const fromContext = (run.input_context as { gap_ids?: unknown }).gap_ids;
  if (Array.isArray(fromContext) && fromContext.every((v) => typeof v === "number")) {
    return fromContext as number[];
  }
  for (const e of run.events) {
    const payload = e.payload as { gap_ids?: unknown };
    if (e.kind === "gaps_examined" && Array.isArray(payload.gap_ids)) {
      return (payload.gap_ids as unknown[]).filter((v): v is number => typeof v === "number");
    }
  }
  return [];
}

export function RunDetail({ run, gaps }: { run: AgentRun; gaps: LearningGap[] }) {
  const result = run.result as { plan_id?: number; report_id?: number; message?: string };
  const error = run.error as { step?: string; message?: string };
  const planReady = run.status === "succeeded" && typeof result?.plan_id === "number";
  const addressed = planReady
    ? gapIdsFromRun(run)
        .map((id) => gaps.find((g) => g.id === id))
        .filter((g): g is LearningGap => g !== undefined)
    : [];
  return (
    <Card title={`Run #${run.id}`} description={`Status: ${run.status.replace(/_/g, " ")}`}>
      {planReady && (
        <div className="mb-4 rounded-xl border border-emerald-600/20 bg-emerald-50 p-4 sm:p-5">
          <p className="flex items-center gap-2 text-[15px] font-bold text-emerald-900">
            <Icon name="check" className="h-5 w-5" />
            Your personalized study plan is ready.
          </p>
          <p className="mt-1 text-sm leading-relaxed text-emerald-800">
            {addressed.length > 0
              ? `Built from ${addressed.length} learning gap${addressed.length === 1 ? "" : "s"}: ${addressed
                  .map((g) => `${g.subject} · ${g.topic}`)
                  .join("; ")}.`
              : "Built from your current learning gaps."}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              to="/plan"
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-emerald-700 px-4 text-sm font-medium text-white shadow-sm transition-colors hover:bg-emerald-800"
            >
              View my study plan
              <Icon name="arrowRight" className="h-4 w-4" />
            </Link>
            {typeof result?.report_id === "number" && (
              <Link
                to={`/reports/${result.report_id}`}
                className="inline-flex h-10 items-center rounded-lg border border-emerald-600/30 bg-white px-4 text-sm font-medium text-emerald-800 transition-colors hover:bg-emerald-50"
              >
                View report
              </Link>
            )}
          </div>
        </div>
      )}
      {run.status === "failed" && error?.message && (
        <div className="mb-4">
          <ErrorState message={`${error.step ?? "run"}: ${error.message}`} />
        </div>
      )}
      <ol className="relative space-y-4 border-l-2 border-slate-200 pl-5">
        {run.events.map((e) => (
          <li key={e.id} className="relative text-sm">
            <span
              aria-hidden="true"
              className={`absolute -left-[27px] top-0.5 flex h-4 w-4 items-center justify-center rounded-full ring-4 ring-white ${
                e.kind === "failed" ? "bg-red-500" : e.kind === "completed" ? "bg-emerald-500" : "bg-brand-500"
              }`}
            >
              {e.kind === "completed" && <Icon name="check" className="h-2.5 w-2.5 text-white" />}
            </span>
            <p className="font-semibold text-slate-900">{KIND_LABELS[e.kind] ?? e.kind}</p>
            <p className="mt-0.5 leading-relaxed text-slate-600">{e.summary}</p>
          </li>
        ))}
      </ol>
      {run.status === "succeeded" && !planReady && result?.message && (
        <p className="mt-3 text-sm text-slate-600">{result.message}</p>
      )}
    </Card>
  );
}
