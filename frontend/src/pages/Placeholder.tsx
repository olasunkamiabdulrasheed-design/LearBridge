import { Card, PageHeader } from "../components/layout/Page";
import { EmptyState } from "../components/ui/States";

export function PlaceholderPage({ title, hint }: { title: string; hint: string }) {
  return (
    <div>
      <PageHeader title={title} subtitle="Planned for the next stage — UI shell only." />
      <Card title={title} description={hint}>
        <EmptyState title="Coming soon" hint="Foundation route is wired; no placeholder data." />
      </Card>
    </div>
  );
}

export function AssessmentPage() {
  return <PlaceholderPage title="Assessment" hint="Students will answer diagnostic questions here." />;
}

export function LearningPlanPage() {
  return (
    <PlaceholderPage title="Learning Plan" hint="Personalized gap-closing path will appear here." />
  );
}

export function ResourcesPage() {
  return (
    <PlaceholderPage title="Resources" hint="Curated explanations, videos, and practice live here." />
  );
}

export function ProgressPage() {
  return (
    <PlaceholderPage title="Progress" hint="Mastery tracking and reports will appear here." />
  );
}

export function NotFoundPage() {
  return (
    <div>
      <PageHeader title="Page not found" subtitle="The route does not exist." />
      <EmptyState title="404" hint="Use the sidebar to navigate." />
    </div>
  );
}
