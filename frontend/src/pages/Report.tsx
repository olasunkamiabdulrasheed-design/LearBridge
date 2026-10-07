import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Card, PageHeader } from "../components/layout/Page";
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
        <PageHeader title="Learning report" subtitle="Sign in to view your report." />
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
  if (error) return <ErrorState message={error} onRetry={() => void load()} />;
  if (!report) return <EmptyState title="Not found" hint="This report is unavailable." />;

  return (
    <div>
      <PageHeader title={report.title} subtitle="Evidence-backed recommendations." />
      <Card title="Summary">
        <p className="text-sm text-slate-700">{report.summary}</p>
      </Card>
      <div className="mt-4 space-y-4">
        {report.findings.map((f) => (
          <Card key={f.gap_id} title={`${f.subject} / ${f.topic}`}>
            <p className="text-xs uppercase tracking-wide text-slate-400">
              Severity: {f.severity} · Wrong answers: {f.wrong_count}
            </p>
            <p className="mt-1 text-sm text-slate-600">Evidence: {f.evidence}</p>
            <div className="mt-3 space-y-2">
              {f.resources.map((r) => (
                <div key={r.resource_id} className="rounded-md border border-slate-200 p-3">
                  <p className="text-sm font-medium">
                    {r.title}{" "}
                    <span className="text-xs text-slate-400">(score {r.score.toFixed(2)})</span>
                  </p>
                  <p className="mt-1 text-sm text-slate-600">{r.rationale}</p>
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-block text-sm text-brand-600 hover:underline"
                  >
                    Open resource
                  </a>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
      <Link
        to="/agent"
        className="mt-4 inline-block rounded-md border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-100"
      >
        ← Back to study agent
      </Link>
    </div>
  );
}
