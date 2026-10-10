import type { Attempt } from "../types/domain";

export interface AssessmentHistory {
  assessmentId: number;
  title: string;
  /** Completed attempts, oldest first. In-progress/abandoned never included. */
  completed: Attempt[];
  count: number;
  baseline: Attempt;
  latest: Attempt;
  best: Attempt;
  /** latest.percentage - baseline.percentage, in percentage points. */
  changePp: number;
}

function attemptTime(a: Attempt): number {
  return new Date(a.completed_at ?? a.started_at).getTime();
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Group completed attempts by assessment. Never compares across assessments. */
export function summarizeAttempts(attempts: Attempt[]): AssessmentHistory[] {
  const byId = new Map<number, Attempt[]>();
  for (const a of attempts) {
    if (a.status !== "completed") continue;
    const list = byId.get(a.assessment) ?? [];
    list.push(a);
    byId.set(a.assessment, list);
  }
  const out: AssessmentHistory[] = [];
  for (const [assessmentId, list] of byId) {
    const sorted = [...list].sort((a, b) => attemptTime(a) - attemptTime(b));
    const baseline = sorted[0];
    const latest = sorted[sorted.length - 1];
    let best = sorted[0];
    for (const a of sorted) {
      if (a.percentage > best.percentage) best = a;
    }
    out.push({
      assessmentId,
      title: latest.assessment_title,
      completed: sorted,
      count: sorted.length,
      baseline,
      latest,
      best,
      changePp: round2(latest.percentage - baseline.percentage),
    });
  }
  out.sort((a, b) => attemptTime(b.latest) - attemptTime(a.latest));
  return out;
}

function fmtPp(n: number): string {
  const r = round2(Math.abs(n));
  return Number.isInteger(r) ? String(r) : String(r);
}

/** Honest wording: percentage points, never percent; negatives shown. */
export function changeText(h: AssessmentHistory): string {
  if (h.count < 2) return "Baseline established";
  if (h.changePp > 0) return `Improved by ${fmtPp(h.changePp)} percentage points`;
  if (h.changePp < 0) return `Performance decreased by ${fmtPp(h.changePp)} percentage points`;
  return "Unchanged since baseline";
}
