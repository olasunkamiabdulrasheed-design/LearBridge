import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, PageHeader } from "../components/layout/Page";
import { EmptyState, ErrorState, LoadingState } from "../components/ui/States";
import { useAuth } from "../context/AuthContext";
import { apiFetch } from "../services/apiClient";
import type { AgentRun, LearningGap, Paginated } from "../types/domain";

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
        <PageHeader title="Study Agent" subtitle="Sign in to get AI study help." />
        <Card title="Sign in required">
          <Link
            to="/login"
            className="inline-block rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
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
        title="Study Agent"
        subtitle="The agent examines your gaps, researches resources, and builds a plan."
      />
      {loading && <LoadingState label="Loading gaps and runs…" />}
      {!loading && error && <ErrorState message={error} onRetry={() => void load()} />}
      {!loading && !error && (
        <div className="space-y-4">
          <Card title="Start a run" description="Select the gaps to address (all open by default).">
            {gaps.length === 0 ? (
              <EmptyState title="No open gaps" hint="Complete an assessment first." />
            ) : (
              <>
                <ul className="space-y-1">
                  {gaps.map((g) => (
                    <li key={g.id}>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={selected.includes(g.id)}
                          onChange={() => toggle(g.id)}
                        />
                        {g.subject} / {g.topic}
                        <span className="text-xs text-slate-400">({g.severity})</span>
                      </label>
                    </li>
                  ))}
                </ul>
                {startError && (
                  <div className="mt-3">
                    <ErrorState message={startError} />
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => void startRun()}
                  disabled={starting || selected.length === 0}
                  className="mt-3 rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
                >
                  {starting ? "Agent is working…" : "Run study agent"}
                </button>
              </>
            )}
          </Card>

          {activeRun && <RunDetail run={activeRun} />}

          <Card title="Past runs" description="Every run keeps its observable step history.">
            {runs.length === 0 ? (
              <EmptyState title="No runs yet" hint="Start your first run above." />
            ) : (
              <ul className="space-y-2">
                {runs.map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => setActiveRun(r)}
                      className="flex w-full items-center justify-between rounded-md border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50"
                    >
                      <span>
                        Run #{r.id} · {r.purpose}
                      </span>
                      <StatusBadge status={r.status} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const color =
    status === "succeeded"
      ? "bg-emerald-50 text-emerald-700"
      : status === "failed"
        ? "bg-red-50 text-red-700"
        : "bg-slate-100 text-slate-600";
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${color}`}>{status}</span>
  );
}

export function RunDetail({ run }: { run: AgentRun }) {
  const result = run.result as { plan_id?: number; report_id?: number; message?: string };
  const error = run.error as { step?: string; message?: string };
  return (
    <Card title={`Run #${run.id}`} description={`Status: ${run.status}`}>
      {run.status === "failed" && error?.message && (
        <div className="mb-3">
          <ErrorState message={`${error.step ?? "run"}: ${error.message}`} />
        </div>
      )}
      <ol className="space-y-2">
        {run.events.map((e) => (
          <li key={e.id} className="flex gap-3 text-sm">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-50 text-[10px] font-bold text-brand-700">
              {e.seq}
            </span>
            <div>
              <p className="font-medium">{KIND_LABELS[e.kind] ?? e.kind}</p>
              <p className="text-slate-600">{e.summary}</p>
            </div>
          </li>
        ))}
      </ol>
      {run.status === "succeeded" && (
        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          {typeof result?.plan_id === "number" && (
            <Link to="/plan" className="rounded-md bg-slate-900 px-3 py-1.5 text-white">
              View study plan
            </Link>
          )}
          {typeof result?.report_id === "number" && (
            <Link
              to={`/reports/${result.report_id}`}
              className="rounded-md border border-slate-300 px-3 py-1.5 hover:bg-slate-100"
            >
              View learning report
            </Link>
          )}
          {result?.message && <p className="text-slate-600">{result.message}</p>}
        </div>
      )}
    </Card>
  );
}
