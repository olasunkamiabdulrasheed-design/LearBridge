# LearnBridge — Stage 3 Autonomous Study Agent

Autonomous education-support platform: diagnose a student's learning gaps,
research and organize resources, and recommend a personalized study path.

Stage 3 delivers the **autonomous intelligence layer**: a fixed-pipeline
agent (`apps/agent/`) that examines a student's gaps, researches resources
(catalog by default, web search optional), evaluates them with per-resource
rationales, builds an evidence-linked study plan, and writes a learning
report. Every step is persisted as an observable `AgentEvent` timeline.
Deterministic fallbacks mean the agent works with zero external credentials;
optional LLM + web-search providers make it stronger when keys are set.

No fake data, no fake search, no invented credentials anywhere.

## Monorepo layout

```text
LearnBridge/
  backend/          Django + DRF, all APIs under /api/v1/
    config/         settings, root urls, wsgi/asgi
    apps/
      urls.py       central router + auth routes
      core/         health, pagination, permissions, test factories
      users/        registration, JWT me, StudentProfile
      assessments/  catalog, attempts, answers, grading service
      questions/    question bank (answer keys hidden from students)
      gaps/         per-student learning gaps
      resources/    curated resource catalog
      plans/        study plans + nested plan items
      progress/     per-item progress tracking
      agent_runs/   AgentRun + AgentEvent persistence + API
      reports/      LearningReport (evidence-backed recommendations)
      agent/        stateless engine: orchestrator, tools, providers (no views)
  frontend/         React + TS + Vite + Tailwind
    src/
      types/domain.ts        typed API models for the new domain
      services/apiClient.ts  JWT fetch wrapper (typed, 401 handling)
      services/auth.ts       register/login/refresh/me
      context/AuthContext.tsx  auth state provider
      pages/                 Dashboard (live counts), Assessment (take flow), Login (real)
```

## Domain architecture

One Django app per bounded context. Public catalog data (assessments,
questions, resources) is separated from student-private data (profiles,
attempts, answers, gaps, plans, progress) at both the model and API layers.

```text
User (django.contrib.auth; passwords hashed, never stored manually)
 └─1:1 StudentProfile  [users]  level, institution, field, learning style

Assessment [assessments]  (public catalog; draft/published/archived)
 └─1:N Question [questions]  (ordering unique per assessment; topic tag)
      └─1:N Answer [assessments]  (unique per attempt+question)

StudentProfile ─1:N AssessmentAttempt [assessments]  (in_progress/completed/…)
      └─1:N Answer  (server-side graded: is_correct, never trusted from client)

AssessmentAttempt ─(complete)─▶ LearningGap [gaps]  (unique per student+subject+topic)
      severity from score bands; evidence cites the attempt; source=assessment

LearningGap ─1:N StudyPlanItem [plans] ─N:1 LearningResource [resources] (catalog)
StudyPlan [plans] ─1:N StudyPlanItem  (ordering unique per plan; dates validated
      against the plan window; item creation auto-creates a Progress row)
StudyPlanItem ─1:1 Progress [progress]  (unique per student+item; completing
      stamps completed_at and normalizes to 100%)
```

Key rules:

- Statuses/severities/difficulties are `TextChoices` enums, not free strings.
- Percentages validated 0–100; `target_date >= start_date`; item
  `scheduled_date` must fall inside its plan window; per-plan ordering unique.
- Question `correct_answer`/`explanation` are **never serialized to students**;
  grading runs server-side (`assessments/services.py`, normalized exact match).
- Gap derivation on attempt completion is a deterministic rule (score bands),
  explicitly a placeholder for stage-3 agent reasoning.
- Every private queryset is scoped to `request.user`; object access additionally
  passes `IsOwner` (staff bypass for admin tooling). No frontend-only filtering.

## API endpoint summary

Auth is JWT (`djangorestframework-simplejwt`). All endpoints except
`/health/` and `POST /auth/register|login|refresh/` require `Authorization:
Bearer <access>`.

| Method & path | Description |
|---|---|
| `GET /api/v1/health/` | Public health check |
| `POST /api/v1/auth/register/` | Register → `{user, access, refresh}` |
| `POST /api/v1/auth/login/` | Login → `{access, refresh}` |
| `POST /api/v1/auth/refresh/` | Refresh access token |
| `GET /api/v1/auth/me/` | Current user + profile |
| `GET/PATCH /api/v1/students/me/` | Own profile (list returns own only) |
| `GET /api/v1/assessments/` | List published (`?subject=&education_level=`) |
| `GET /api/v1/assessments/{id}/` | Detail incl. questions (keys hidden) |
| `GET /api/v1/assessments/{id}/questions/` | Questions (staff see keys) |
| `POST /api/v1/assessments/{id}/start/` | Start attempt (one in-progress max) |
| `GET /api/v1/attempts/` | Own attempts (`?status=&assessment=`) |
| `GET /api/v1/attempts/{id}/` + `/result/` | Own attempt / result with answers |
| `POST /api/v1/attempts/{id}/answers/` | Submit `{answers:[{question, answer}]}` |
| `POST /api/v1/attempts/{id}/complete/` | Grade, score, derive gaps |
| `GET /api/v1/gaps/` | Own gaps (`?subject=&status=&severity=`) |
| `GET /api/v1/gaps/{id}/` | Own gap detail |
| `GET /api/v1/resources/` | Catalog (`?subject=&topic=&difficulty=&resource_type=`) |
| `GET /api/v1/resources/{id}/` | Resource detail |
| `GET/POST /api/v1/study-plans/` | Own plans (`?status=`); create |
| `GET/PATCH/DELETE /api/v1/study-plans/{id}/` | Own plan |
| `GET/POST /api/v1/study-plans/{id}/items/` | Plan items |
| `GET/PATCH/DELETE /api/v1/study-plans/{id}/items/{item}/` | Plan item |
| `GET/POST /api/v1/progress/` | Own progress (`?study_plan=&status=`) |
| `GET/PATCH /api/v1/progress/{id}/` | Update progress |
| `POST /api/v1/agent-runs/` | Start agent run `{purpose, gap_ids?, plan_id?, target_date?}` |
| `GET /api/v1/agent-runs/` | Own runs (`?status=`), each with `events` timeline |
| `GET /api/v1/agent-runs/{id}/` | Own run detail + events + result |
| `POST /api/v1/agent-runs/{id}/cancel/` | Cancel a non-terminal run |
| `GET /api/v1/reports/` + `/{id}/` | Own learning reports |

Collection endpoints are paginated (`?page=` / `?page_size=`, max 100).
Catalog writes (assessments/questions/resources, gap creation) are staff-only.

## Backend setup

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
python manage.py migrate
python manage.py seed_demo   # optional demo catalog (idempotent)
python manage.py runserver 8000
```

PostgreSQL: set `DATABASE_URL=postgres://user:pass@host:5432/db` in
`backend/.env`. Empty `DATABASE_URL` uses local SQLite.

Tests: `python manage.py test` (103 tests, all passing — see below).

Agent env (all optional; empty keys = deterministic local mode — see
`backend/.env.example`): `AGENT_ENABLED`, `AGENT_MAX_STEPS`,
`AGENT_TIMEOUT_SECONDS`, `AGENT_ALLOW_WEB`, `LEARNBRIDGE_LLM_PROVIDER`,
`LEARNBRIDGE_LLM_API_KEY`, `LEARNBRIDGE_LLM_BASE_URL`,
`LEARNBRIDGE_LLM_MODEL`, `LEARNBRIDGE_SEARCH_PROVIDER`, `TAVILY_API_KEY`.

## Frontend setup

```powershell
cd frontend
Copy-Item .env.example .env   # sets VITE_API_BASE_URL
npm.cmd install
npm.cmd run dev      # http://localhost:5173
npm.cmd run typecheck
npm.cmd run build
```

Stage-2 frontend is intentionally thin: JWT auth state (`AuthContext`),
typed `apiFetch` client, domain types, Dashboard live counts, a working
Assessment take-flow (list → start → answer → submit → complete → result),
and a real login/register page. Learning-plan/resources/progress pages
remain placeholders.

Stage 3 adds: `Study Agent` page (gap checklist → run → observable event
timeline → plan/report links), `Learning report` page (per-gap evidence +
resource rationales), Dashboard "Get AI study help" entry, and
`AgentRun`/`AgentEvent`/`LearningReport` domain types.

## Example API flow

```powershell
$B = "http://localhost:8000/api/v1"
# register/login
$R = Invoke-RestMethod "$B/auth/register/" -Method Post -ContentType "application/json" `
  -Body '{"username":"ada","email":"ada@example.com","password":"strongpass123"}'
$H = @{ Authorization = "Bearer $($R.access)" }
# create/retrieve student profile
Invoke-RestMethod "$B/students/me/" -Headers $H
Invoke-RestMethod "$B/students/me/" -Method Patch -Headers $H `
  -ContentType "application/json" -Body '{"education_level":"high"}'
# choose assessment
$A = Invoke-RestMethod "$B/assessments/" -Headers $H
$id = $A.results[0].id
# start attempt
$T = Invoke-RestMethod "$B/assessments/$id/start/" -Method Post -Headers $H
# submit answers (question ids from $B/assessments/$id/questions/)
Invoke-RestMethod "$B/attempts/$($T.id)/answers/" -Method Post -Headers $H `
  -ContentType "application/json" -Body '{"answers":[{"question":1,"answer":"B"}]}'
# complete attempt → score + gaps
Invoke-RestMethod "$B/attempts/$($T.id)/complete/" -Method Post -Headers $H
# retrieve result
Invoke-RestMethod "$B/attempts/$($T.id)/result/" -Headers $H
# learning gaps become available
$G = Invoke-RestMethod "$B/gaps/" -Headers $H
# create study plan + item
$P = Invoke-RestMethod "$B/study-plans/" -Method Post -Headers $H `
  -ContentType "application/json" `
  -Body '{"title":"Catch up","start_date":"2026-10-01","target_date":"2026-10-14"}'
Invoke-RestMethod "$B/study-plans/$($P.id)/items/" -Method Post -Headers $H `
  -ContentType "application/json" `
  -Body ('{"learning_gap":' + $G.results[0].id + ',"title":"Practice","ordering":1}')
# track progress (auto-created row exists; PATCH it)
$PR = Invoke-RestMethod "$B/progress/?study_plan=$($P.id)" -Headers $H
Invoke-RestMethod "$B/progress/$($PR.results[0].id)/" -Method Patch -Headers $H `
  -ContentType "application/json" -Body '{"status":"completed"}'
# run the study agent over your gaps (synchronous; returns timeline + plan/report)
$RUN = Invoke-RestMethod "$B/agent-runs/" -Method Post -Headers $H `
  -ContentType "application/json" -Body '{"purpose":"remediate_gaps"}'
$RUN.events | ForEach-Object { "$($_.seq). $($_.kind): $($_.summary)" }
Invoke-RestMethod "$B/reports/$($RUN.result.report_id)/" -Headers $H
```

## Agent architecture (stage 3)

Fixed pipeline, inline execution: `POST /agent-runs/` → `run_agent(run_id)`
runs inspect → research → evaluate → build → report, appending an
`AgentEvent` per step (Started → Gaps examined → Researched → Evaluated →
Plan built → Report written → Completed). Only summaries + IDs/scores are
stored — no prompts, page text, or chain-of-thought.

Tools (`apps/agent/tools.py`): `inspect_learning_gaps`, `search_learning_resources`,
`fetch_resource` (SSRF-guarded: http/https, public IPs only, size-capped excerpts),
`evaluate_resource`, `build_study_plan` (via stage-2 serializers, atomic),
`update_progress_recommendation`, `generate_learning_report`.

Providers (`apps/agent/providers/`): `catalog` search + deterministic
evaluate/report fallbacks work with zero credentials. Optional
`openai_compatible` LLM and `tavily` web search activate via env flags;
every provider failure degrades gracefully and is recorded as an event.
Ownership: the engine loads the student from the run row and every tool
queries only that student's rows; `gap_ids`/`plan_id` inputs are validated
as own (foreign IDs → 400, no side effects).

## Test report (stage 3)

`python manage.py test` — **103 tests, OK** (66 stage-2 + 37 new), covering:
engine units (gap inspection scoping, catalog search, deterministic scoring,
SSRF blocks, keyless-provider behavior, progress recommendation, full
pipeline with fake providers), agent API (run → plan + items + rationales +
report, evidence-specificity regression, no-gap success, foreign gap/plan
rejection, concurrent-run guard, failure recording, disabled-agent 503,
refresh_plan, cancel, cross-student 404s, report read-only contract),
plus all stage-2 suites still passing. Frontend `typecheck` clean,
`vite build` succeeds (48 modules).
