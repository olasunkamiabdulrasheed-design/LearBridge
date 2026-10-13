import { Link } from "react-router-dom";
import { Icon, type IconName } from "../components/ui/icons";
import { PrimaryLink, SecondaryLink } from "../components/layout/PublicLayout";

const JOURNEY: { icon: IconName; step: string; title: string; text: string }[] = [
  {
    icon: "assessment",
    step: "01",
    title: "Diagnose",
    text: "Short assessments pinpoint the exact topics and skills you have not mastered yet.",
  },
  {
    icon: "compass",
    step: "02",
    title: "Plan",
    text: "Your results become a guided study path, prioritized by the gaps that matter most.",
  },
  {
    icon: "progress",
    step: "03",
    title: "Improve",
    text: "Study with focused resources, re-assess, and watch your progress close each gap.",
  },
];

const HIGHLIGHTS: { icon: IconName; title: string; text: string }[] = [
  { icon: "assessment", title: "Targeted assessments", text: "Measure what you actually know, topic by topic." },
  { icon: "agent", title: "Study Agent guidance", text: "Ask questions and get direction on what to study next." },
  { icon: "plan", title: "Personal learning plan", text: "A clear sequence of steps built from your results." },
  { icon: "resources", title: "Curated resources", text: "Materials matched to the gaps in your plan." },
  { icon: "progress", title: "Progress tracking", text: "See gaps open and close as you keep learning." },
  { icon: "report", title: "Clear reports", text: "Readable summaries you can learn from and revisit." },
];

export function LandingPage() {
  return (
    <>
      <section className="border-b border-[var(--lb-line)] bg-gradient-to-b from-brand-50 to-white">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-2 lg:py-24">
          <div>
            <p className="lb-eyebrow">Guided learning platform</p>
            <h1 className="mt-3 text-4xl font-bold leading-[1.1] tracking-tight text-slate-900 sm:text-5xl">
              From learning gaps to guided growth.
            </h1>
            <p className="mt-5 max-w-lg text-lg leading-relaxed text-slate-600">
              LearnBridge diagnoses what you have not mastered yet, turns it into a personal study
              plan, and helps you measure real improvement — one step at a time.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <PrimaryLink to="/register">Get Started</PrimaryLink>
              <SecondaryLink to="/how-it-works">See how it works</SecondaryLink>
            </div>
            <p className="mt-6 text-sm text-slate-500">
              Already have an account?{" "}
              <Link to="/login" className="font-medium text-brand-600 hover:underline">
                Log in
              </Link>
            </p>
          </div>

          <div className="mx-auto w-full max-w-md">
            <div className="lb-card">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-900">Your learning journey</p>
                <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700">
                  <Icon name="target" className="h-3.5 w-3.5" />
                  Goal: close gaps
                </span>
              </div>
              <ol className="mt-5 space-y-4">
                {JOURNEY.map((item) => (
                  <li key={item.title} className="flex items-start gap-3">
                    <span
                      aria-hidden="true"
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600"
                    >
                      <Icon name={item.icon} className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-[15px] font-semibold text-slate-900">{item.title}</p>
                      <p className="mt-0.5 text-sm leading-relaxed text-slate-600">{item.text}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="max-w-2xl">
          <p className="lb-eyebrow">The journey</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            A simple loop that keeps you moving forward.
          </h2>
          <p className="mt-3 text-slate-600">
            Every step feeds the next. Assessments shape your plan, your plan points to resources,
            and re-assessment shows what changed.
          </p>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {JOURNEY.map((item) => (
            <div key={item.title} className="lb-card">
              <span className="text-xs font-semibold text-brand-600">{item.step}</span>
              <div className="mt-3 flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                <Icon name={item.icon} className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-slate-900">{item.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{item.text}</p>
            </div>
          ))}
        </div>
        <div className="mt-8">
          <Link
            to="/how-it-works"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:underline"
          >
            Walk through every stage
            <Icon name="arrowRight" className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <section className="border-y border-[var(--lb-line)] bg-[var(--lb-canvas)]">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="max-w-2xl">
            <p className="lb-eyebrow">What you get</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Everything you need to learn with direction.
            </h2>
          </div>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {HIGHLIGHTS.map((item) => (
              <div key={item.title} className="lb-card">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                  <Icon name={item.icon} className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-[15px] font-semibold text-slate-900">{item.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">{item.text}</p>
              </div>
            ))}
          </div>
          <div className="mt-8">
            <Link
              to="/features"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:underline"
            >
              Explore all features
              <Icon name="arrowRight" className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="lb-card bg-gradient-to-br from-brand-500 to-brand-600 text-center text-white">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Start turning gaps into progress.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-white/90">
            Create your account and take your first diagnostic in minutes.
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              to="/register"
              className="inline-flex h-11 items-center justify-center rounded-lg bg-white px-5 text-sm font-semibold text-brand-600 shadow-sm transition-colors hover:bg-brand-50"
            >
              Get Started
            </Link>
            <Link
              to="/how-it-works"
              className="inline-flex h-11 items-center justify-center rounded-lg border border-white/40 px-5 text-sm font-medium text-white transition-colors hover:bg-white/10"
            >
              See how it works
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
