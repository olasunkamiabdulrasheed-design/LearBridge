import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, PageHeader } from "../components/layout/Page";
import { EmptyState, ErrorState, LoadingState } from "../components/ui/States";
import { useAuth } from "../context/AuthContext";
import { apiFetch } from "../services/apiClient";
import type {
  LearningGap,
  LearningResource,
  Paginated,
  Progress,
  StudyPlan,
} from "../types/domain";
import { StatusBadge } from "./Agent";

function isActive(plan: StudyPlan): boolean {
  return plan.status === "active";
}

export function LearningPlanPage() {
  const { isAuthenticated, initializing } = useAuth();
  const [plans, setPlans] = useState<StudyPlan[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const [gapsById, setGapsById] = useState<Map<number, LearningGap>>(new Map());
  const [resourcesById, setResourcesById] = useState<Map<number, LearningResource>>(new Map());
  const [progressByItem, setProgressByItem] = useState<Map<number, Progress>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [completingId, setCompletingId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadPlans = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const page = await apiFetch<Paginated<StudyPlan>>("/study-plans/?page_size=100");
      const sorted = [...page.results].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
      setPlans(sorted);
      const def = sorted.find(isActive) ?? sorted[0] ?? null;
      setSelectedId(def ? def.id : null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load study plans.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDetail = useCallback(async (planId: number) => {
    setDetailLoading(true);
    setDetailError(null);
    try {
      const [detail, gapPage, resourcePage, progressPage] = await Promise.all([
        apiFetch<StudyPlan>(`/study-plans/${planId}/`),
        apiFetch<Paginated<LearningGap>>("/gaps/?page_size=100"),
        apiFetch<Paginated<LearningResource>>("/resources/?page_size=100"),
        apiFetch<Paginated<Progress>>(`/progress/?study_plan=${planId}&page_size=100`),
      ]);
      setPlan(detail);
      setGapsById(new Map(gapPage.results.map((g) => [g.id, g])));
      setResourcesById(new Map(resourcePage.results.map((r) => [r.id, r])));
      setProgressByItem(new Map(progressPage.results.map((p) => [p.study_plan_item, p])));
    } catch (e) {
      setDetailError(e instanceof Error ? e.message : "Unable to load plan details.");
      setPlan(null);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!initializing && isAuthenticated) void loadPlans();
  }, [initializing, isAuthenticated, loadPlans]);

  useEffect(() => {
    if (selectedId !== null) void loadDetail(selectedId);
  }, [selectedId, loadDetail]);

  const items = useMemo(
    () => [...(plan?.items ?? [])].sort((a, b) => a.ordering - b.ordering),
    [plan],
  );

  async function markComplete(itemId: number) {
    const progress = progressByItem.get(itemId);
    if (!progress || !plan) return;
    setCompletingId(itemId);
    setActionError(null);
    try {
      const updated = await apiFetch<Progress>(`/progress/${progress.id}/`, {
        method: "PATCH",
        body: JSON.stringify({ status: "completed", completion_percentage: 100 }),
      });
      // Apply the confirmed API response, then refetch to prove persistence.
      setProgressByItem((m) => new Map(m).set(itemId, updated));
      const fresh = await apiFetch<Paginated<Progress>>(
        `/progress/?study_plan=${plan.id}&page_size=100`,
      );
      setProgressByItem(new Map(fresh.results.map((p) => [p.study_plan_item, p])));
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Could not update progress.");
    } finally {
      setCompletingId(null);
    }
  }

  if (initializing) return <LoadingState label="Restoring session…" />;
  if (!isAuthenticated) {
    return (
      <div>
        <PageHeader title="Learning Plan" subtitle="Your personalized gap-closing path." />
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
        title="Learning Plan"
        subtitle="Your personalized path for closing identified learning gaps, step by step."
      />
      {loading && <LoadingState label="Loading study plans…" />}
      {!loading && error && <ErrorState message={error} onRetry={() => void loadPlans()} />}
      {!loading && !error && plans.length === 0 && (
        <Card title="No learning plan yet">
          <EmptyState
            title="No learning plan yet"
            hint="The Study Agent can generate a personalized plan from your identified learning gaps."
          />
          <Link
            to="/agent"
            className="mt-3 inline-block rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
          >
            Go to Study Agent
          </Link>
        </Card>
      )}
      {!loading && !error && plans.length > 0 && (
        <div className="space-y-4">
          {plans.length > 1 && (
            <Card title="Your plans" description="Switch between your study plans.">
              <select
                value={selectedId ?? ""}
                onChange={(e) => setSelectedId(Number(e.target.value))}
                className="w-full max-w-md rounded-md border border-slate-300 px-3 py-2 text-sm"
                aria-label="Select study plan"
              >
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title} ({p.status})
                  </option>
                ))}
              </select>
            </Card>
          )}
          {detailLoading && <LoadingState label="Loading plan details…" />}
          {!detailLoading && detailError && (
            <ErrorState
              message={detailError}
              onRetry={() => selectedId !== null && void loadDetail(selectedId)}
            />
          )}
          {!detailLoading && !detailError && plan && (
            <>
              <Card
                title={plan.title}
                description={plan.description || "No description."}
              >
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <StatusBadge status={plan.status} />
                  {plan.origin === "agent" && (
                    <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700">
                      Built by Study Agent{plan.agent_run !== null ? ` · run #${plan.agent_run}` : ""}
                    </span>
                  )}
                </div>
                <dl className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-slate-400">Start date</dt>
                    <dd>{plan.start_date || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-slate-400">Target date</dt>
                    <dd>{plan.target_date || "—"}</dd>
                  </div>
                </dl>
              </Card>

              {actionError && (
                <ErrorState message={actionError} />
              )}

              {items.length === 0 ? (
                <Card title="Plan items">
                  <EmptyState title="No items in this plan" hint="Items will appear here once added." />
                </Card>
              ) : (
                <div className="space-y-3">
                  {items.map((item) => {
                    const gap = item.learning_gap !== null ? gapsById.get(item.learning_gap) : undefined;
                    const resource = item.resource !== null ? resourcesById.get(item.resource) : undefined;
                    const progress = progressByItem.get(item.id);
                    const done = progress?.status === "completed";
                    const busy = completingId === item.id;
                    return (
                      <Card key={item.id} title={`Step ${item.ordering}: ${item.title}`}>
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusBadge status={progress?.status ?? item.status} />
                          {typeof progress?.completion_percentage === "number" && (
                            <span className="text-xs text-slate-500">
                              {progress.completion_percentage}% complete
                            </span>
                          )}
                        </div>
                        {item.description && (
                          <p className="mt-2 text-sm text-slate-600">{item.description}</p>
                        )}
                        {gap && (
                          <p className="mt-1 text-sm text-slate-600">
                            <span className="font-medium">Gap:</span> {gap.subject} / {gap.topic}{" "}
                            <span className="text-xs text-slate-400">({gap.severity})</span>
                          </p>
                        )}
                        {item.rationale && (
                          <p className="mt-1 text-sm text-slate-600">
                            <span className="font-medium">Why this helps:</span> {item.rationale}
                          </p>
                        )}
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                          {item.estimated_minutes !== null && (
                            <span>≈ {item.estimated_minutes} min</span>
                          )}
                          {item.scheduled_date && <span>Scheduled: {item.scheduled_date}</span>}
                          {progress?.completed_at && <span>Completed: {progress.completed_at}</span>}
                        </div>
                        {resource && (
                          <div className="mt-2 text-sm">
                            <span className="font-medium">Resource:</span>{" "}
                            {resource.url ? (
                              <a
                                href={resource.url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-brand-600 hover:underline"
                              >
                                {resource.title}
                              </a>
                            ) : (
                              <span className="text-slate-600">{resource.title}</span>
                            )}
                          </div>
                        )}
                        {!done && progress && (
                          <button
                            type="button"
                            onClick={() => void markComplete(item.id)}
                            disabled={busy}
                            className="mt-3 rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
                          >
                            {busy ? "Saving…" : "Mark complete"}
                          </button>
                        )}
                        {done && (
                          <p className="mt-3 text-sm font-medium text-emerald-700">Completed ✓</p>
                        )}
                      </Card>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
