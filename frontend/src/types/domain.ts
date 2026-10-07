/** Typed models mirroring the LearnBridge API (backend is the source of truth). */

export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface User {
  id: number;
  username: string;
  email: string;
}

export interface StudentProfile {
  id: number;
  user: User;
  education_level: string;
  institution: string;
  field_of_study: string;
  preferred_learning_style: string;
  created_at: string;
  updated_at: string;
}

export interface Assessment {
  id: number;
  title: string;
  description: string;
  subject: string;
  education_level: string;
  status: string;
  question_count: number;
  created_at: string;
  updated_at: string;
  questions?: Question[];
}

export interface QuestionOption {
  key: string;
  text: string;
}

export interface Question {
  id: number;
  assessment: number;
  question_text: string;
  question_type: "multiple_choice" | "true_false" | "short_answer";
  options: { options: QuestionOption[] } | null;
  difficulty: string;
  topic: string;
  ordering: number;
}

export interface Answer {
  id: number;
  question: number;
  answer: string;
  is_correct: boolean;
  answered_at: string;
}

export interface Attempt {
  id: number;
  assessment: number;
  assessment_title: string;
  status: "in_progress" | "completed" | "abandoned";
  score: number;
  percentage: number;
  started_at: string;
  completed_at: string | null;
  question_count: number;
  answers: Answer[];
}

export interface LearningGap {
  id: number;
  student: number;
  subject: string;
  topic: string;
  description: string;
  severity: string;
  source: string;
  evidence: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface LearningResource {
  id: number;
  title: string;
  description: string;
  url: string;
  resource_type: string;
  subject: string;
  topic: string;
  difficulty: string;
  source_name: string;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface StudyPlan {
  id: number;
  student: number;
  title: string;
  description: string;
  start_date: string;
  target_date: string;
  status: string;
  origin: string;
  agent_run: number | null;
  item_count: number;
  items: StudyPlanItem[];
  created_at: string;
  updated_at: string;
}

export interface StudyPlanItem {
  id: number;
  study_plan: number;
  learning_gap: number | null;
  resource: number | null;
  title: string;
  description: string;
  rationale: string;
  scheduled_date: string | null;
  estimated_minutes: number | null;
  status: string;
  ordering: number;
}

export interface Progress {
  id: number;
  student: number;
  study_plan_item: number;
  study_plan: number;
  status: string;
  completion_percentage: number;
  completed_at: string | null;
  notes: string;
  updated_at: string;
}

export interface AgentEvent {
  id: number;
  seq: number;
  kind: string;
  summary: string;
  payload: Record<string, unknown>;
  created_at: string;
}

export interface AgentRun {
  id: number;
  student: number;
  purpose: string;
  status: "queued" | "running" | "succeeded" | "failed" | "cancelled";
  started_at: string;
  completed_at: string | null;
  input_context: Record<string, unknown>;
  result: Record<string, unknown>;
  error: Record<string, unknown>;
  events: AgentEvent[];
}

export interface ReportResource {
  resource_id: number;
  title: string;
  url: string;
  score: number;
  rationale: string;
}

export interface ReportFinding {
  gap_id: number;
  subject: string;
  topic: string;
  severity: string;
  evidence: string;
  wrong_count: number;
  resources: ReportResource[];
  plan_item_ids: number[];
}

export interface LearningReport {
  id: number;
  student: number;
  agent_run: number;
  title: string;
  summary: string;
  findings: ReportFinding[];
  created_at: string;
}
