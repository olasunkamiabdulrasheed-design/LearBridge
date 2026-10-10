import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Card, PageHeader } from "../components/layout/Page";
import { StatusBadge } from "../components/ui/StatusBadge";
import { EmptyState, ErrorState, LoadingState } from "../components/ui/States";
import { useAuth } from "../context/AuthContext";
import { apiFetch } from "../services/apiClient";
import type { LearningReport } from "../types/domain";

export function ReportPage() {
  const { id } = useParams<{ id: string }>();
  const { isAuthenticated, initializing } = useAuth();
  const [report, setReport] = useState<LearningReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      setReport(await apiFetch<LearningReport>(`/reports/${id}/`));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load report.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!initializing && isAuthenticated) void load();
  }, [initializing, isAuthenticated, load]);

  if (initializing || loading) return <LoadingState label="Loading report…" />;
  if (!isAuthenticated) {
    return (
      <div>
        <PageHeader eyebrow="Report" title="Learning report" subtitle="Sign in to view your report." />
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
  if (error) return <ErrorState message={error} onRetry={() => void load()} />;
  if (!report) return <EmptyState title="Not found" hint="This report is unavailable." />;

  const topFinding = [...report.findings].sort((a, b) => b.wrong_count - a.wrong_count)[0];

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader eyebrow="Report" title={report.title} subtitle="Evidence-backed recommendations." />
      <Card title="Summary" description={report.summary} />

      <div className="mt-4">
        <Card
          title="Key finding"
          description={
            topFinding
              ? `Your biggest opportunity is ${topFinding.subject} · ${topFinding.topic}.`
              : "No gap findings in this report."
          }
        >
          {topFinding ? (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <StatusBadge status={topFinding.severity} />
              <span className="text-sm text-slate-600">
                {topFinding.wrong_count} wrong answer{topFinding.wrong_count === 1 ? "" : "s"}
              </span>
              <Link
                to="/agent"
                className="ml-auto inline-flex h-10 items-center rounded-lg bg-brand-500 px-4 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-600"
              >
                Continue to Study Agent →
              </Link>
            </div>
          ) : (
            <p className="text-sm text-slate-500">Nothing to prioritize right now.</p>
          )}
        </Card>
      </div>

      {report.findings.length > 0 && (
        <div className="mt-4 space-y-3">
          <p className="lb-eyebrow">All findings</p>
          {report.findings.map((f) => (
            <Card key={f.gap_id} title={`${f.subject} / ${f.topic}`}>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={f.severity} />
                <span className="text-xs text-slate-500">Wrong answers: {f.wrong_count}</span>
              </div>
              <p className="mt-2 border-l-2 border-slate-200 pl-3 text-sm italic leading-relaxed text-slate-600">
                {f.evidence}
              </p>
              {f.resources.length > 0 && (
                <div className="mt-3 space-y-2">
                  {f.resources.map((r) => (
                    <div key={r.resource_id} className="rounded-lg bg-slate-50 px-3.5 py-3">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-900">{r.title}</p>
                        <span className="text-xs tabular-nums text-slate-500">
                          match {r.score.toFixed(2)}
                        </span>
                      </div>
                      <p className="mt-1 text-sm leading-relaxed text-slate-600">{r.rationale}</p>
                      <a
                        href={r.url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1.5 inline-block text-sm font-medium text-brand-600 hover:underline"
                      >
                        Open resource
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
