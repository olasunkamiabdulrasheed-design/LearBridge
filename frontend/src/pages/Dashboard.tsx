import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, PageHeader } from "../components/layout/Page";
import { ErrorState, LoadingState } from "../components/ui/States";
import { useAuth } from "../context/AuthContext";
import { apiFetch } from "../services/apiClient";
import { fetchHealth, type HealthResponse } from "../services/health";
import type { LearningGap, Paginated, StudyPlan } from "../types/domain";

interface DashboardData {
  gapCount: number;
  planCount: number;
}

export function DashboardPage() {
  const { user, profile, isAuthenticated, initializing } = useAuth();
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);

  const loadHealth = useCallback(async () => {
    setHealthLoading(true);
    setHealthError(null);
    try {
      setHealth(await fetchHealth());
    } catch (e) {
      setHealthError(e instanceof Error ? e.message : "Unable to reach the API.");
      setHealth(null);
    } finally {
      setHealthLoading(false);
    }
  }, []);

  const loadData = useCallback(async () => {
    setDataLoading(true);
    setDataError(null);
    try {
      const [gaps, plans] = await Promise.all([
        apiFetch<Paginated<LearningGap>>("/gaps/?page_size=1"),
        apiFetch<Paginated<StudyPlan>>("/study-plans/?page_size=1"),
      ]);
      setData({ gapCount: gaps.count, planCount: plans.count });
    } catch (e) {
      setDataError(e instanceof Error ? e.message : "Unable to load dashboard data.");
      setData(null);
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadHealth();
  }, [loadHealth]);

  useEffect(() => {
    if (!initializing && isAuthenticated) void loadData();
  }, [initializing, isAuthenticated, loadData]);

  return (
    <div>
      <PageHeader
        title={user ? `Welcome, ${user.username}` : "Student Dashboard"}
        subtitle="Learning gaps, study plans, and progress at a glance."
      />

      {initializing ? (
        <LoadingState label="Restoring session…" />
      ) : !isAuthenticated ? (
        <Card title="Sign in required" description="Sign in to see your learning data.">
          <Link
            to="/login"
            className="inline-block rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
          >
            Go to sign in
          </Link>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          <Card title="Profile" description="Your learner record.">
            {profile ? (
              <p className="text-sm text-slate-600">
                {profile.education_level}
                {profile.field_of_study ? ` · ${profile.field_of_study}` : ""}
              </p>
            ) : (
              <p className="text-sm text-slate-500">No profile found.</p>
            )}
          </Card>
          <Card title="Learning gaps" description="Diagnosed from assessments.">
            {dataLoading && <LoadingState label="Loading gaps…" />}
            {dataError && <ErrorState message={dataError} onRetry={() => void loadData()} />}
            {!dataLoading && !dataError && data && (
              <>
                <p className="text-2xl font-bold">{data.gapCount}</p>
                {data.gapCount > 0 && (
                  <Link
                    to="/agent"
                    className="mt-2 inline-block rounded-md bg-brand-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-600"
                  >
                    Get AI study help
                  </Link>
                )}
              </>
            )}
          </Card>
          <Card title="Study plans" description="Your personalized paths.">
            {dataLoading && <LoadingState label="Loading plans…" />}
            {dataError && <ErrorState message={dataError} onRetry={() => void loadData()} />}
            {!dataLoading && !dataError && data && (
              <p className="text-2xl font-bold">{data.planCount}</p>
            )}
          </Card>
        </div>
      )}

      <div className="mt-4">
        <Card title="Backend connection" description="Live status of the LearnBridge API.">
          {healthLoading && <LoadingState label="Checking API health…" />}
          {!healthLoading && healthError && (
            <ErrorState message={healthError} onRetry={() => void loadHealth()} />
          )}
          {!healthLoading && !healthError && health && (
            <p className="text-sm text-emerald-700">
              Connected · status={health.status} · service={health.service}
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
