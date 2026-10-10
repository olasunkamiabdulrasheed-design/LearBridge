import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, PageHeader } from "../components/layout/Page";
import { Button } from "../components/ui/controls";
import { Icon } from "../components/ui/icons";
import { EmptyState, ErrorState, LoadingState } from "../components/ui/States";
import { useAuth } from "../context/AuthContext";
import { apiFetch } from "../services/apiClient";
import { changeText, summarizeAttempts, type AssessmentHistory } from "../services/attemptHistory";
import type { Answer, Assessment, Attempt, Paginated, Question } from "../types/domain";

type View = { name: "list" } | { name: "detail"; id: number };

export function AssessmentPage() {
  const { isAuthenticated, initializing } = useAuth();
  const [view, setView] = useState<View>({ name: "list" });
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [historyByAssessment, setHistoryByAssessment] = useState<Map<number, AssessmentHistory>>(
    new Map(),
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [assessmentPage, attemptPage] = await Promise.all([
        apiFetch<Paginated<Assessment>>("/assessments/"),
        apiFetch<Paginated<Attempt>>("/attempts/?status=completed&page_size=100"),
      ]);
      setAssessments(assessmentPage.results);
      setHistoryByAssessment(
        new Map(summarizeAttempts(attemptPage.results).map((h) => [h.assessmentId, h])),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load assessments.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!initializing && isAuthenticated) void load();
  }, [initializing, isAuthenticated, load]);

  if (initializing) return <LoadingState label="Restoring session…" />;
  if (!isAuthenticated) {
    return (
      <div>
        <PageHeader eyebrow="Diagnostics" title="Assessments" subtitle="Sign in to take a diagnostic assessment." />
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
  if (view.name === "detail") {
    return (
      <AssessmentDetail
        id={view.id}
        onBack={() => {
          setView({ name: "list" });
          void load();
        }}
      />
    );
  }
  return (
    <div>
      <PageHeader
        eyebrow="Diagnostics"
        title="Assessments"
        subtitle="Short diagnostics reveal your learning gaps — retake any of them to measure improvement."
      />
      {loading && <LoadingState label="Loading assessments…" />}
      {!loading && error && <ErrorState message={error} onRetry={() => void load()} />}
      {!loading && !error && assessments.length === 0 && (
        <EmptyState title="No assessments yet" hint="Published assessments will appear here." />
      )}
      {!loading && !error && assessments.length > 0 && (
        <Card title="Available diagnostics" description={`${assessments.length} published`} padded={false}>
          <ul className="divide-y divide-slate-100">
            {assessments.map((a) => {
              const h = historyByAssessment.get(a.id);
              return (
                <li
                  key={a.id}
                  className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4 sm:px-6"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-semibold text-slate-900">{a.title}</p>
                    <p className="mt-0.5 text-[13px] text-slate-500">
                      {a.subject} · {a.question_count} questions
                      {h
                        ? ` · Best ${h.best.percentage}% · ${h.count} attempt${h.count === 1 ? "" : "s"}`
                        : " · Not attempted yet"}
                    </p>
                  </div>
                  <Button size="sm" onClick={() => setView({ name: "detail", id: a.id })}>
                    {h ? "Retake" : "Start"}
                    <Icon name="arrowRight" className="h-3.5 w-3.5" />
                  </Button>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}

function AssessmentDetail({ id, onBack }: { id: number; onBack: () => void }) {
  const [detail, setDetail] = useState<Assessment | null>(null);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [history, setHistory] = useState<AssessmentHistory | null>(null);
  const [draft, setDraft] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [fetched, attemptPage] = await Promise.all([
        apiFetch<Assessment>(`/assessments/${id}/`),
        apiFetch<Paginated<Attempt>>(`/attempts/?assessment=${id}&status=completed&page_size=100`),
      ]);
      setDetail(fetched);
      setHistory(summarizeAttempts(attemptPage.results).find((h) => h.assessmentId === id) ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load assessment.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function start() {
    setBusy(true);
    setActionError(null);
    try {
      const created = await apiFetch<Attempt>(`/assessments/${id}/start/`, { method: "POST" });
      setAttempt(created);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Could not start attempt.");
    } finally {
      setBusy(false);
    }
  }

  async function retake() {
    setAttempt(null);
    setDraft({});
    await start();
  }

  async function refreshHistory() {
    try {
      const attemptPage = await apiFetch<Paginated<Attempt>>(
        `/attempts/?assessment=${id}&status=completed&page_size=100`,
      );
      setHistory(summarizeAttempts(attemptPage.results).find((h) => h.assessmentId === id) ?? null);
    } catch {
      // History is supplementary; the result card already shows this attempt.
    }
  }

  async function submitAnswers() {
    if (!attempt) return;
    setBusy(true);
    setActionError(null);
    try {
      const questions = detail?.questions ?? [];
      await apiFetch<Answer[]>(`/attempts/${attempt.id}/answers/`, {
        method: "POST",
        body: JSON.stringify({
          answers: questions.map((q) => ({ question: q.id, answer: draft[q.id] ?? "" })),
        }),
      });
      const refreshed = await apiFetch<Attempt>(`/attempts/${attempt.id}/result/`);
      setAttempt(refreshed);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Could not submit answers.");
    } finally {
      setBusy(false);
    }
  }

  async function complete() {
    if (!attempt) return;
    setBusy(true);
    setActionError(null);
    try {
      const finished = await apiFetch<Attempt>(`/attempts/${attempt.id}/complete/`, {
        method: "POST",
      });
      setAttempt(finished);
      await refreshHistory();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Could not complete attempt.");
    } finally {
      setBusy(false);
    }
  }

  const questions = useMemo(() => detail?.questions ?? [], [detail]);
  const answered = useMemo(
    () => questions.filter((q) => (draft[q.id] ?? "").trim() !== "").length,
    [questions, draft],
  );
  const correctness = useMemo(
    () => new Map((attempt?.answers ?? []).map((a) => [a.question, a.is_correct])),
    [attempt],
  );
  const done = attempt?.status === "completed";

  if (loading) return <LoadingState label="Loading assessment…" />;
  if (error) return <ErrorState message={error} onRetry={() => void load()} />;
  if (!detail) return <EmptyState title="Not found" hint="This assessment is unavailable." />;

  return (
    <div className="mx-auto max-w-3xl">
      <button
        type="button"
        onClick={onBack}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900"
      >
        <Icon name="arrowLeft" className="h-4 w-4" />
        All assessments
      </button>
      <PageHeader title={detail.title} subtitle={`${detail.subject} · ${questions.length} questions`} />
      {actionError && (
        <div className="mb-4">
          <ErrorState message={actionError} />
        </div>
      )}

      {!attempt && history && history.count > 0 && (
        <Card
          title="Your history"
          description={`Baseline ${history.baseline.percentage}% · Latest ${history.latest.percentage}% · ${history.count} attempts`}
        >
          <ul className="divide-y divide-slate-100">
            {history.completed.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                <span className="text-slate-600">
                  Attempt #{a.id}
                  {a.completed_at ? ` · ${a.completed_at}` : ""}
                </span>
                <span className="font-semibold tabular-nums">
                  {a.score}/{a.question_count} · {a.percentage}%
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-sm font-semibold">{changeText(history)}</p>
          <Button onClick={() => void retake()} disabled={busy} className="mt-3">
            {busy ? "Starting…" : "Retake assessment"}
          </Button>
        </Card>
      )}

      {!attempt && (
        <Card
          title={history ? "Start a new attempt" : "Ready?"}
          description="Starting creates a graded attempt linked to your profile. Previous attempts are kept."
        >
          {!history && (
            <Button onClick={() => void start()} disabled={busy}>
              {busy ? "Starting…" : history ? "Start new attempt" : "Start attempt"}
            </Button>
          )}
        </Card>
      )}

      {attempt && !done && (
        <div>
          <div
            className="sticky top-16 z-10 -mx-1 mb-4 rounded-xl border bg-white/95 px-4 py-3 shadow-sm backdrop-blur"
            style={{ borderColor: "var(--lb-line)" }}
            role="status"
            aria-label={`Answered ${answered} of ${questions.length} questions`}
          >
            <div className="flex items-center justify-between text-xs font-medium text-slate-600">
              <span>
                Attempt #{attempt.id} · Answered {answered} of {questions.length}
              </span>
              <span className="tabular-nums">
                {questions.length === 0 ? 0 : Math.round((answered / questions.length) * 100)}%
              </span>
            </div>
            <div className="lb-meter mt-2">
              <span
                style={{
                  width: `${questions.length === 0 ? 0 : Math.round((answered / questions.length) * 100)}%`,
                }}
              />
            </div>
          </div>
          <div className="space-y-4">
            {questions.map((q, i) => (
              <QuestionInput
                key={q.id}
                index={i}
                question={q}
                value={draft[q.id] ?? ""}
                disabled={busy}
                wasCorrect={correctness.get(q.id)}
                onChange={(v) => setDraft((d) => ({ ...d, [q.id]: v }))}
              />
            ))}
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button onClick={() => void submitAnswers()} disabled={busy}>
              Submit answers
            </Button>
            <Button variant="secondary" onClick={() => void complete()} disabled={busy}>
              Complete attempt
            </Button>
          </div>
        </div>
      )}

      {attempt && done && (
        <Card
          title={`Result — ${attempt.score}/${attempt.question_count} (${attempt.percentage}%)`}
          description={history && history.count >= 2 ? changeText(history) : "Baseline established — retake later to measure improvement."}
        >
          {history && history.count >= 2 && (
            <dl className="mb-4 grid grid-cols-3 gap-2 text-center">
              {[
                { k: "Baseline", v: `${history.baseline.percentage}%` },
                { k: "Latest", v: `${history.latest.percentage}%` },
                { k: "Best", v: `${history.best.percentage}%` },
              ].map((s) => (
                <div key={s.k} className="rounded-lg bg-slate-50 px-2 py-2.5">
                  <dt className="lb-eyebrow">{s.k}</dt>
                  <dd className="mt-0.5 text-lg font-bold tabular-nums">{s.v}</dd>
                </div>
              ))}
            </dl>
          )}
          <ul className="space-y-1.5">
            {questions.map((q, i) => (
              <li key={q.id} className="flex items-center gap-2.5 text-sm">
                <span
                  aria-hidden="true"
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white ${
                    correctness.get(q.id) ? "bg-emerald-500" : "bg-red-500"
                  }`}
                >
                  {correctness.get(q.id) ? "✓" : "✕"}
                </span>
                <span className={correctness.get(q.id) ? "text-slate-700" : "font-medium text-slate-900"}>
                  Q{i + 1}
                  {!correctness.get(q.id) && q.topic ? ` · ${q.topic}` : ""}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm text-slate-500">
            Wrong answers have been recorded as learning gaps.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => void retake()} disabled={busy}>
              {busy ? "Starting…" : "Retake assessment"}
            </Button>
            <Link
              to="/progress"
              className="inline-flex h-10 items-center rounded-lg px-4 text-sm font-medium text-brand-600 transition-colors hover:bg-brand-50"
            >
              View progress →
            </Link>
          </div>
        </Card>
      )}
    </div>
  );
}

function QuestionInput({
  index,
  question,
  value,
  disabled,
  wasCorrect,
  onChange,
}: {
  index: number;
  question: Question;
  value: string;
  disabled: boolean;
  wasCorrect: boolean | undefined;
  onChange: (v: string) => void;
}) {
  return (
    <fieldset className="lb-card">
      <legend className="sr-only">Question {index + 1}</legend>
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-brand-600">
        Question {index + 1}
      </p>
      <p className="mt-1 text-[16px] font-medium leading-relaxed text-slate-900">
        {question.question_text}
        {wasCorrect === true && <span className="ml-2 font-bold text-emerald-600">✓</span>}
        {wasCorrect === false && <span className="ml-2 font-bold text-red-600">✗</span>}
      </p>
      {question.question_type === "short_answer" ? (
        <input
          type="text"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className="lb-input mt-3"
          placeholder="Type your answer"
          aria-label={`Answer for question ${index + 1}`}
        />
      ) : (
        <div className="mt-3 space-y-1.5">
          {(question.question_type === "true_false"
            ? [
                { key: "true", text: "True" },
                { key: "false", text: "False" },
              ]
            : (question.options?.options ?? [])
          ).map((opt) => {
            const checked = value === opt.key;
            return (
              <label
                key={opt.key}
                className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3.5 py-2.5 text-[15px] transition-colors ${
                  checked
                    ? "border-brand-500 bg-brand-50 font-medium text-slate-900"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                <input
                  type="radio"
                  name={`q-${question.id}`}
                  checked={checked}
                  disabled={disabled}
                  onChange={() => onChange(opt.key)}
                  className="h-4 w-4 shrink-0 accent-[#2f5bff]"
                />
                {question.question_type === "multiple_choice" ? (
                  <span>
                    <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-md bg-slate-100 text-xs font-bold text-slate-600">
                      {opt.key}
                    </span>
                    {opt.text}
                  </span>
                ) : (
                  opt.text
                )}
              </label>
            );
          })}
        </div>
      )}
      {question.topic && (
        <p className="mt-2.5 text-xs text-slate-500">Topic: {question.topic}</p>
      )}
    </fieldset>
  );
}
