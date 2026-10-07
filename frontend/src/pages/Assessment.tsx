import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, PageHeader } from "../components/layout/Page";
import { EmptyState, ErrorState, LoadingState } from "../components/ui/States";
import { useAuth } from "../context/AuthContext";
import { apiFetch } from "../services/apiClient";
import type { Answer, Assessment, Attempt, Paginated, Question } from "../types/domain";

type View = { name: "list" } | { name: "detail"; id: number };

export function AssessmentPage() {
  const { isAuthenticated, initializing } = useAuth();
  const [view, setView] = useState<View>({ name: "list" });
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const page = await apiFetch<Paginated<Assessment>>("/assessments/");
      setAssessments(page.results);
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
        <PageHeader title="Assessment" subtitle="Sign in to take a diagnostic assessment." />
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
      <PageHeader title="Assessments" subtitle="Choose a diagnostic to reveal learning gaps." />
      {loading && <LoadingState label="Loading assessments…" />}
      {!loading && error && <ErrorState message={error} onRetry={() => void load()} />}
      {!loading && !error && assessments.length === 0 && (
        <EmptyState title="No assessments yet" hint="Published assessments will appear here." />
      )}
      {!loading && !error && assessments.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {assessments.map((a) => (
            <Card key={a.id} title={a.title} description={`${a.subject} · ${a.question_count} questions`}>
              <p className="text-sm text-slate-500">{a.description || "No description."}</p>
              <button
                type="button"
                onClick={() => setView({ name: "detail", id: a.id })}
                className="mt-3 rounded-md bg-brand-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-600"
              >
                Open
              </button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function AssessmentDetail({ id, onBack }: { id: number; onBack: () => void }) {
  const [detail, setDetail] = useState<Assessment | null>(null);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [draft, setDraft] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setDetail(await apiFetch<Assessment>(`/assessments/${id}/`));
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
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Could not complete attempt.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <LoadingState label="Loading assessment…" />;
  if (error) return <ErrorState message={error} onRetry={() => void load()} />;
  if (!detail) return <EmptyState title="Not found" hint="This assessment is unavailable." />;

  const questions = detail.questions ?? [];
  const correctness = new Map((attempt?.answers ?? []).map((a) => [a.question, a.is_correct]));
  const done = attempt?.status === "completed";

  return (
    <div>
      <PageHeader title={detail.title} subtitle={`${detail.subject} · ${questions.length} questions`} />
      {actionError && (
        <div className="mb-4">
          <ErrorState message={actionError} />
        </div>
      )}
      {!attempt && (
        <Card title="Ready?" description="Starting creates a graded attempt linked to your profile.">
          <button
            type="button"
            onClick={() => void start()}
            disabled={busy}
            className="rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
          >
            {busy ? "Starting…" : "Start attempt"}
          </button>
        </Card>
      )}
      {attempt && !done && (
        <Card
          title={`Attempt #${attempt.id} — in progress`}
          description="Answer each question, then submit and complete."
        >
          <div className="space-y-5">
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
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void submitAnswers()}
                disabled={busy}
                className="rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
              >
                Submit answers
              </button>
              <button
                type="button"
                onClick={() => void complete()}
                disabled={busy}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-100 disabled:opacity-50"
              >
                Complete attempt
              </button>
            </div>
          </div>
        </Card>
      )}
      {attempt && done && (
        <Card title="Result" description={`Score ${attempt.score}/${attempt.question_count} (${attempt.percentage}%).`}>
          <ul className="space-y-2 text-sm">
            {questions.map((q, i) => (
              <li key={q.id} className="flex items-center gap-2">
                <span
                  className={`inline-block h-3 w-3 rounded-full ${
                    correctness.get(q.id) ? "bg-emerald-500" : "bg-red-500"
                  }`}
                />
                Q{i + 1}: {correctness.get(q.id) ? "correct" : "incorrect"}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm text-slate-500">
            Wrong answers have been recorded as learning gaps — see the Dashboard.
          </p>
        </Card>
      )}
      <button
        type="button"
        onClick={onBack}
        className="mt-4 rounded-md border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-100"
      >
        ← Back to assessments
      </button>
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
    <fieldset>
      <legend className="text-sm font-medium">
        Q{index + 1}. {question.question_text}
        {wasCorrect === true && <span className="ml-2 text-emerald-600">✓</span>}
        {wasCorrect === false && <span className="ml-2 text-red-600">✗</span>}
      </legend>
      {question.question_type === "short_answer" ? (
        <input
          type="text"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          placeholder="Your answer"
        />
      ) : (
        <div className="mt-2 space-y-1">
          {(question.question_type === "true_false"
            ? [
                { key: "true", text: "True" },
                { key: "false", text: "False" },
              ]
            : (question.options?.options ?? [])
          ).map((opt) => (
            <label key={opt.key} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name={`q-${question.id}`}
                checked={value === opt.key}
                disabled={disabled}
                onChange={() => onChange(opt.key)}
              />
              {question.question_type === "multiple_choice" ? `${opt.key}. ${opt.text}` : opt.text}
            </label>
          ))}
        </div>
      )}
      {question.topic && <p className="mt-1 text-xs text-slate-400">Topic: {question.topic}</p>}
    </fieldset>
  );
}
