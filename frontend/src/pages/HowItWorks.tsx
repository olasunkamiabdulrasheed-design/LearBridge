import { Icon, type IconName } from "../components/ui/icons";
import {
  PageHero,
  PrimaryLink,
  SecondaryLink,
} from "../components/layout/PublicLayout";

const STAGES: {
  icon: IconName;
  title: string;
  text: string;
  detail: string;
  next: string;
}[] = [
  {
    icon: "dashboard",
    title: "Set up your profile",
    text: "Create an account to get a personal space for your diagnostics, plans, and progress.",
    detail:
      "Your account keeps every result and plan in one place, so each visit continues where the last one stopped.",
    next: "Next: take a diagnostic.",
  },
  {
    icon: "assessment",
    title: "Take a diagnostic assessment",
    text: "Short assessments measure what you understand across specific topics and skills.",
    detail:
      "Instead of a single score, each assessment records which topics you have mastered and which ones need work.",
    next: "Next: review your results.",
  },
  {
    icon: "report",
    title: "Review your results",
    text: "See a clear breakdown of correct and incorrect answers, topic by topic.",
    detail:
      "Results surface your learning gaps — the specific areas where your answers show you are not there yet.",
    next: "Next: get a learning plan.",
  },
  {
    icon: "plan",
    title: "Get a guided learning plan",
    text: "Your gaps become a prioritized study plan, ordered by what to focus on first.",
    detail:
      "The plan turns scattered weak spots into a sequence of steps so you always know what to study next.",
    next: "Next: study with resources.",
  },
  {
    icon: "resources",
    title: "Study with matched resources",
    text: "Work through resources chosen to match the gaps in your plan.",
    detail:
      "As you complete material, your plan updates so your effort stays focused on the areas that need it.",
    next: "Next: track your progress.",
  },
  {
    icon: "progress",
    title: "Track progress and re-assess",
    text: "Re-take assessments to confirm gaps are closing and see improvement over time.",
    detail:
      "Progress is measured, not guessed. Each re-assessment shows how far you have moved since you started.",
    next: "Then: repeat the loop as you grow.",
  },
];

export function HowItWorksPage() {
  return (
    <>
      <PageHero eyebrow="How It Works" title="Your path from gaps to growth">
        LearnBridge is built around one repeating loop: diagnose what is missing, plan what to study
        next, and measure how much you have improved.
      </PageHero>

      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <div className="max-w-2xl">
          <p className="lb-eyebrow">The stages</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
            How the stages connect.
          </h2>
          <p className="mt-3 text-slate-600">
            Each stage builds on the one before it. You can restart the loop at any time — every new
            assessment can reshape your plan and reveal fresh progress.
          </p>
        </div>

        <ol className="relative mt-12 space-y-8 border-l border-[var(--lb-line)] pl-8">
          {STAGES.map((stage, i) => (
            <li key={stage.title} className="relative">
              <span
                aria-hidden="true"
                className="absolute -left-[57px] flex h-8 w-8 items-center justify-center rounded-full bg-brand-500 text-xs font-bold text-white ring-4 ring-white"
              >
                {i + 1}
              </span>
              <div className="lb-card">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                    <Icon name={stage.icon} className="h-5 w-5" />
                  </span>
                  <h3 className="text-lg font-semibold text-slate-900">{stage.title}</h3>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">{stage.text}</p>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">{stage.detail}</p>
                <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600">
                  <Icon name="arrowRight" className="h-3.5 w-3.5" />
                  {stage.next}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="border-t border-[var(--lb-line)] bg-[var(--lb-canvas)]">
        <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 sm:py-20">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Ready to start the loop?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-slate-600">
            Create an account and take your first diagnostic to see where your gaps are.
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <PrimaryLink to="/register">Get Started</PrimaryLink>
            <SecondaryLink to="/features">Explore features</SecondaryLink>
          </div>
        </div>
      </section>
    </>
  );
}
