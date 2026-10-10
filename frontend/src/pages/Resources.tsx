import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, PageHeader } from "../components/layout/Page";
import { Button, Field, SelectInput, TextInput } from "../components/ui/controls";
import { EmptyState, ErrorState, LoadingState } from "../components/ui/States";
import { useAuth } from "../context/AuthContext";
import { apiFetch } from "../services/apiClient";
import type {
  LearningGap,
  LearningResource,
  Paginated,
  StudyPlan,
} from "../types/domain";

const RESOURCE_TYPES = ["", "video", "article", "book", "course", "practice", "interactive", "other"];

function buildQuery(subject: string, resourceType: string): string {
  const params = new URLSearchParams();
  const s = subject.trim();
  if (s) params.set("subject", s);
  if (resourceType) params.set("resource_type", resourceType);
  params.set("page_size", "100");
  return `?${params.toString()}`;
}

export function ResourcesPage() {
  const { isAuthenticated, initializing } = useAuth();
  const [resources, setResources] = useState<LearningResource[]>([]);
  const [gapContext, setGapContext] = useState<Map<number, LearningGap[]>>(new Map());
  const [subject, setSubject] = useState("");
  const [resourceType, setResourceType] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (subjectFilter: string, typeFilter: string) => {
    setLoading(true);
    setError(null);
    try {
      const [resourcePage, planPage, gapPage] = await Promise.all([
        apiFetch<Paginated<LearningResource>>(
          `/resources/${buildQuery(subjectFilter, typeFilter)}`,
        ),
        apiFetch<Paginated<StudyPlan>>("/study-plans/?page_size=100"),
        apiFetch<Paginated<LearningGap>>("/gaps/?page_size=100"),
      ]);
      setResources(resourcePage.results);
      const gapsById = new Map(gapPage.results.map((g) => [g.id, g]));
      const context = new Map<number, LearningGap[]>();
      for (const plan of planPage.results) {
        for (const item of plan.items ?? []) {
          if (item.resource !== null && item.learning_gap !== null) {
            const gap = gapsById.get(item.learning_gap);
            if (gap) {
              const list = context.get(item.resource) ?? [];
              if (!list.some((g) => g.id === gap.id)) list.push(gap);
              context.set(item.resource, list);
            }
          }
        }
      }
      setGapContext(context);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load resources.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!initializing && isAuthenticated) void load("", "");
  }, [initializing, isAuthenticated, load]);

  const applyFilters = useMemo(
    () => () => void load(subject, resourceType),
    [load, subject, resourceType],
  );

  if (initializing) return <LoadingState label="Restoring session…" />;
  if (!isAuthenticated) {
    return (
      <div>
        <PageHeader title="Resources" subtitle="Learning materials matched to your gaps." />
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
        title="Resources"
        subtitle="Materials connected to your learning gaps and plan activities."
      />
      <Card title="Filter" description="Filters run against the backend catalog.">
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Subject">
            <TextInput
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Mathematics"
              className="w-48"
            />
          </Field>
          <Field label="Type">
            <SelectInput
              value={resourceType}
              onChange={(e) => setResourceType(e.target.value)}
            >
              {RESOURCE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t === "" ? "All types" : t}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Button
            type="button"
            variant="secondary"
            onClick={applyFilters}
            className="bg-slate-900 text-white hover:bg-slate-700 border-transparent"
          >
            Apply
          </Button>
          {(subject || resourceType) && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setSubject("");
                setResourceType("");
                void load("", "");
              }}
            >
              Clear
            </Button>
          )}
        </div>
      </Card>

      <div className="mt-4">
        {loading && <LoadingState label="Loading resources…" />}
        {!loading && error && <ErrorState message={error} onRetry={() => void load(subject, resourceType)} />}
        {!loading && !error && resources.length === 0 && (
          <Card title="Resources">
            <EmptyState
              title="No resources found"
              hint="Try clearing the filters, or run the Study Agent to get recommendations for your gaps."
            />
          </Card>
        )}
        {!loading && !error && resources.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2">
            {resources.map((r) => {
              const linked = gapContext.get(r.id) ?? [];
              return (
                <Card key={r.id} title={r.title}>
                  <div className="flex flex-wrap gap-1.5 text-xs">
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 font-medium text-slate-600">
                      {r.resource_type}
                    </span>
                    {r.difficulty && (
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 font-medium text-slate-600">
                        {r.difficulty}
                      </span>
                    )}
                  </div>
                  {r.description && <p className="mt-2 text-sm text-slate-600">{r.description}</p>}
                  <p className="mt-1 text-xs text-slate-500">
                    {r.subject}
                    {r.topic ? ` · ${r.topic}` : ""}
                    {r.source_name ? ` · ${r.source_name}` : ""}
                  </p>
                  {linked.length > 0 && (
                    <p className="mt-2 text-sm text-brand-700">
                      Recommended for: {linked.map((g) => `${g.subject} · ${g.topic}`).join("; ")}
                    </p>
                  )}
                  {r.url ? (
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-block text-sm font-medium text-brand-600 hover:underline"
                    >
                      Open resource
                    </a>
                  ) : (
                    <p className="mt-2 text-xs text-slate-500">No link provided</p>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
