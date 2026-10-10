import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, PageHeader } from "../components/layout/Page";
import { EmptyState, ErrorState, LoadingState } from "../components/ui/States";
import { useAuth } from "../context/AuthContext";
import { apiFetch } from "../services/apiClient";
import { changeText, summarizeAttempts } from "../services/attemptHistory";
import type {
  Assessment,
  Attempt,
  LearningGap,
  Paginated,
  Progress,
  StudyPlan,
} from "../types/domain";
import { StatusBadge } from "../components/ui/StatusBadge";

function isActiveGap(g: LearningGap): boolean {
  return g.status === "open" || g.status === "in_progress";
}

export function ProgressPage() {
  const { isAuthenticated, initializing } = useAuth();
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [gaps, setGaps] = useState<LearningGap[]>([]);
  const [plans, setPlans] = useState<StudyPlan[]>([]);
  const [assessmentsById, setAssessmentsById] = useState<Map<number, Assessment>>(new Map());
  const [progressRows, setProgressRows] = useState<Progress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [attemptPage, gapPage, planPage, assessmentPage, progressPage] = await Promise.all([
        apiFetch<Paginated<Attempt>>("/attempts/?status=completed&page_size=100"),
        apiFetch<Paginated<LearningGap>>("/gaps/?page_size=100"),
        apiFetch<Paginated<StudyPlan>>("/study-plans/?page_size=100"),
        apiFetch<Paginated<Assessment>>("/assessments/?page_size=100"),
        apiFetch<Paginated<Progress>>("/progress/?page_size=100"),
      ]);
      setAttempts(attemptPage.results);
      setGaps(gapPage.results);
      setPlans(planPage.results);
      setAssessmentsById(new Map(assessmentPage.results.map((a) => [a.id, a])));
      setProgressRows(progressPage.results);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load progress data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!initializing && isAuthenticated) void load();
  }, [initializing, isAuthenticated, load]);

  const latestAttempt = useMemo(() => {
    const done = attempts.filter((a) => a.completed_at);
    done.sort(
      (a, b) => new Date(b.completed_at as string).getTime() - new Date(a.completed_at as string).getTime(),
    );
    return done[0] ?? null;
  }, [attempts]);

  const activeGaps = useMemo(() => gaps.filter(isActiveGap), [gaps]);

  const currentPlan = useMemo(() => {
    const sorted = [...plans].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
    return sorted.find((p) => p.status === "active") ?? sorted[0] ?? null;
  }, [plans]);

  const progressByItem = useMemo(
    () => new Map(progressRows.map((p) => [p.study_plan_item, p])),
    [progressRows],
  );

  const assessmentHistory = useMemo(() => summarizeAttempts(attempts), [attempts]);

  const planStats = useMemo(() => {
    if (!currentPlan) return null;
    const items = [...(currentPlan.items ?? [])].sort((a, b) => a.ordering - b.ordering);
    const total = items.length;
    const completed = items.filter((i) => progressByItem.get(i.id)?.status === "completed").length;
    return {
      items,
      total,
      completed,
      remaining: total - completed,
      pct: total === 0 ? 0 : Math.round((completed / total) * 100),
    };
  }, [currentPlan, progressByItem]);

  if (initializing) return <LoadingState label="Restoring session…" />;
  if (!isAuthenticated) {
    return (
      <div>
        <PageHeader title="Progress" subtitle="How your learning is advancing." />
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

  const hasAnything =
    attempts.length > 0 || gaps.length > 0 || plans.length > 0 || progressRows.length > 0;

  return (
    <div>
      <PageHeader
        title="Progress"
        subtitle="Your real learning activity — assessments, gaps, plans, and completed work."
      />
      {loading && <LoadingState label="Loading progress…" />}
      {!loading && error && <ErrorState message={error} onRetry={() => void load()} />}
      {!loading && !error && !hasAnything && (
        <Card title="No progress yet">
          <EmptyState
            title="Nothing to show yet"
            hint="Complete an assessment to generate your first results, gaps, and plan."
          />
          <Link
            to="/assessment"
            className="mt-3 inline-block rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
          >
            Take an assessment
          </Link>
        </Card>
      )}
      {!loading && !error && hasAnything && (
        <div className="space-y-4">
          <Card title="Learning summary" description="Totals across your account.">
            <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-md border border-slate-200 p-3">
                <dt className="text-xs uppercase tracking-wide text-slate-500">Assessments completed</dt>
                <dd className="text-2xl font-bold">{attempts.length}</dd>
              </div>
              <div className="rounded-md border border-slate-200 p-3">
                <dt className="text-xs uppercase tracking-wide text-slate-500">Latest score</dt>
                <dd className="text-2xl font-bold">
                  {latestAttempt ? `${latestAttempt.percentage}%` : "—"}
                </dd>
                {latestAttempt && (
                  <dd className="text-xs text-slate-500">
                    {latestAttempt.assessment_title} · {latestAttempt.score}/{latestAttempt.question_count}
                  </dd>
                )}
              </div>
              <div className="rounded-md border border-slate-200 p-3">
                <dt className="text-xs uppercase tracking-wide text-slate-500">Active gaps</dt>
                <dd className="text-2xl font-bold">{activeGaps.length}</dd>
              </div>
              <div className="rounded-md border border-slate-200 p-3">
                <dt className="text-xs uppercase tracking-wide text-slate-500">Current plan</dt>
                <dd className="text-sm font-semibold">
                  {currentPlan ? (
                    <Link to="/plan" className="text-brand-600 hover:underline">
                      {currentPlan.title}
                    </Link>
                  ) : (
                    "—"
                  )}
                </dd>
                {planStats && (
                  <dd className="text-xs text-slate-500">
                    {planStats.completed}/{planStats.total} done ({planStats.pct}%)
                  </dd>
                )}
              </div>
            </dl>
          </Card>

          {assessmentHistory.length > 0 && (
            <Card title="Assessment history" description="Baseline vs latest per assessment.">
              <ul className="space-y-2">
                {assessmentHistory.map((h) => (
                  <li
                    key={h.assessmentId}
                    className="rounded-md border border-slate-200 px-3 py-2 text-sm"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-medium">{h.title}</p>
                        <p className="text-xs text-slate-500">
                          {assessmentsById.get(h.assessmentId)?.subject ?? "—"} ·{" "}
                          {h.count} attempt{h.count === 1 ? "" : "s"} · Best {h.best.percentage}%
                        </p>
                      </div>
                      <span className="font-bold">{changeText(h)}</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      Baseline: {h.baseline.percentage}% ({h.baseline.score}/{h.baseline.question_count})
                      {" · "}Latest: {h.latest.percentage}% ({h.latest.score}/{h.latest.question_count})
                    </p>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {attempts.length > 0 && (
            <Card title="Assessment performance" description="Your completed attempts.">
              <ul className="space-y-2">
                {attempts.map((a) => (
                  <li
                    key={a.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm"
                  >
                    <div>
                      <p className="font-medium">{a.assessment_title}</p>
                      <p className="text-xs text-slate-500">
                        {assessmentsById.get(a.assessment)?.subject ?? "—"}
                        {a.completed_at ? ` · ${a.completed_at}` : ""}
                      </p>
                    </div>
                    <span className="font-bold">
                      {a.score}/{a.question_count} · {a.percentage}%
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {gaps.length > 0 && (
            <Card title="Learning gaps" description="What assessments revealed.">
              <ul className="space-y-2">
                {gaps.map((g) => (
                  <li key={g.id} className="rounded-md border border-slate-200 px-3 py-2 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">
                        {g.subject} / {g.topic}
                      </span>
                      <StatusBadge status={g.status} />
                      <span className="text-xs text-slate-500">({g.severity})</span>
                    </div>
                    {g.evidence && <p className="mt-1 text-xs text-slate-500">{g.evidence}</p>}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {currentPlan && planStats && (
            <Card
              title="Learning plan progress"
              description={`${currentPlan.title} — ${planStats.total} items, ${planStats.completed} done, ${planStats.remaining} remaining (${planStats.pct}%).`}
            >
              <div className="mb-3 h-2 w-full overflow-hidden rounded-full bg-slate-200">
                <div className="h-full bg-brand-500" style={{ width: `${planStats.pct}%` }} />
              </div>
              {planStats.items.length === 0 ? (
                <EmptyState title="No items in this plan" hint="Items will appear here once added." />
              ) : (
                <ul className="space-y-2">
                  {planStats.items.map((item) => {
                    const pr = progressByItem.get(item.id);
                    return (
                      <li
                        key={item.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm"
                      >
                        <div>
                          <p className="font-medium">
                            Step {item.ordering}: {item.title}
                          </p>
                          <p className="text-xs text-slate-500">
                            {pr ? `${pr.status} · ${pr.completion_percentage}%` : item.status}
                            {pr?.completed_at ? ` · done ${pr.completed_at}` : ""}
                          </p>
                        </div>
                        <Link to="/plan" className="text-sm text-brand-600 hover:underline">
                          Open plan
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
