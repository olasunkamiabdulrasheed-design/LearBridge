import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, PageHeader } from "../components/layout/Page";
import { Icon } from "../components/ui/icons";
import { ErrorState, LoadingState } from "../components/ui/States";
import { useAuth } from "../context/AuthContext";
import { apiFetch } from "../services/apiClient";
import { fetchHealth, type HealthResponse } from "../services/health";
import type { Attempt, LearningGap, Paginated, Progress as ProgressRow, StudyPlan } from "../types/domain";

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export function DashboardPage() {
  const { user, isAuthenticated, initializing } = useAuth();
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [gaps, setGaps] = useState<LearningGap[]>([]);
  const [plans, setPlans] = useState<StudyPlan[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [progressRows, setProgressRows] = useState<ProgressRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadHealth = useCallback(async () => {
    try {
      setHealth(await fetchHealth());
      setHealthError(null);
    } catch (e) {
      setHealthError(e instanceof Error ? e.message : "Unable to reach the API.");
      setHealth(null);
    }
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [gapPage, planPage, attemptPage, progressPage] = await Promise.all([
        apiFetch<Paginated<LearningGap>>("/gaps/?page_size=100"),
        apiFetch<Paginated<StudyPlan>>("/study-plans/?page_size=100"),
        apiFetch<Paginated<Attempt>>("/attempts/?status=completed&page_size=100"),
        apiFetch<Paginated<ProgressRow>>("/progress/?page_size=100"),
      ]);
      setGaps(gapPage.results);
      setPlans(planPage.results);
      setAttempts(attemptPage.results);
      setProgressRows(progressPage.results);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load dashboard data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadHealth();
  }, [loadHealth]);

  useEffect(() => {
    if (!initializing && isAuthenticated) void loadData();
  }, [initializing, isAuthenticated, loadData]);

  const openGaps = useMemo(
    () => gaps.filter((g) => g.status === "open" || g.status === "in_progress"),
    [gaps],
  );
  const activePlan = useMemo(
    () => plans.find((p) => p.status === "active") ?? null,
    [plans],
  );
  const latestAttempt = useMemo(() => {
    const done = attempts.filter((a) => a.completed_at);
    done.sort(
      (a, b) => new Date(b.completed_at as string).getTime() - new Date(a.completed_at as string).getTime(),
    );
    return done[0] ?? null;
  }, [attempts]);
  const nextStep = useMemo(() => {
    if (activePlan) {
      const items = [...(activePlan.items ?? [])].sort((a, b) => a.ordering - b.ordering);
      const doneIds = new Set(
        progressRows
          .filter((p) => p.status === "completed")
          .map((p) => p.study_plan_item),
      );
      const next = items.find((i) => !doneIds.has(i.id));
      if (next) {
        return {
          eyebrow: "Resume learning",
          title: `Step ${next.ordering}: ${next.title}`,
          text: activePlan.title,
          to: "/plan",
          cta: "Continue plan",
        };
      }
      return {
        eyebrow: "Plan complete",
        title: activePlan.title,
        text: "Every activity is done — review your improvement or re-assess.",
        to: "/progress",
        cta: "View progress",
      };
    }
    if (openGaps.length > 0) {
      return {
        eyebrow: "Recommended next",
        title: `${openGaps.length} open gap${openGaps.length === 1 ? "" : "s"} to address`,
        text: openGaps.slice(0, 3).map((g) => `${g.subject} · ${g.topic}`).join("; "),
        to: "/agent",
        cta: "Open Study Agent",
      };
    }
    return {
      eyebrow: "Get started",
      title: "Take your first diagnostic",
      text: "A short assessment reveals exactly where to focus.",
      to: "/assessment",
      cta: "Browse assessments",
    };
  }, [activePlan, openGaps, progressRows]);

  if (initializing) return <LoadingState label="Restoring session…" />;
  if (!isAuthenticated) {
    return (
      <div>
        <PageHeader
          eyebrow="LearnBridge"
          title="Learn smarter, not longer"
          subtitle="Diagnostics find your gaps, the Study Agent builds your plan, and re-assessments prove you improved."
        />
        <Card title="Sign in required" description="Sign in to see your learning data.">
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
        eyebrow="Overview"
        title={user ? `${greeting()}, ${user.username}` : "Student Dashboard"}
        subtitle="Your current situation, what to do next, and how far you've come."
      />
      {loading && <LoadingState label="Loading your overview…" />}
      {!loading && error && <ErrorState message={error} onRetry={() => void loadData()} />}
      {!loading && !error && (
        <>
          <Card
            title={nextStep.title}
            description={nextStep.text}
          >
            <p className="lb-eyebrow">{nextStep.eyebrow}</p>
            <Link
              to={nextStep.to}
              className="mt-3 inline-flex h-10 items-center gap-2 rounded-lg bg-brand-500 px-4 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-600"
            >
              {nextStep.cta}
              <Icon name="arrowRight" className="h-4 w-4" />
            </Link>
          </Card>

          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <Card title="Open gaps" description="Topics to work on.">
              <p className="text-3xl font-bold tracking-tight">{openGaps.length}</p>
              <Link to="/agent" className="mt-2 inline-block text-sm font-medium text-brand-600 hover:underline">
                Review in Study Agent →
              </Link>
            </Card>
            <Card title="Assessments done" description="Completed diagnostics.">
              <p className="text-3xl font-bold tracking-tight">{attempts.length}</p>
              {latestAttempt ? (
                <p className="mt-2 text-sm text-slate-600">
                  Latest: {latestAttempt.assessment_title} · {latestAttempt.percentage}%
                </p>
              ) : (
                <Link to="/assessment" className="mt-2 inline-block text-sm font-medium text-brand-600 hover:underline">
                  Take one →
                </Link>
              )}
            </Card>
            <Card title="Study plans" description="Active and past paths.">
              <p className="text-3xl font-bold tracking-tight">{plans.length}</p>
              {activePlan ? (
                <Link to="/plan" className="mt-2 inline-block text-sm font-medium text-brand-600 hover:underline">
                  {activePlan.title} →
                </Link>
              ) : (
                <p className="mt-2 text-sm text-slate-500">No active plan yet.</p>
              )}
            </Card>
          </div>
        </>
      )}

      <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
        <span
          aria-hidden="true"
          className={`inline-block h-2 w-2 rounded-full ${
            health && !healthError ? "bg-emerald-500" : "bg-slate-300"
          }`}
        />
        {healthError ? (
          <span>
            API unreachable.{" "}
            <button type="button" onClick={() => void loadHealth()} className="font-medium text-brand-600 hover:underline">
              Retry
            </button>
          </span>
        ) : (
          <span>Connected{health ? ` to ${health.service}` : "…"}</span>
        )}
      </div>
    </div>
  );
}
