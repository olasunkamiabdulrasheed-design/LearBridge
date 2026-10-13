import { Icon, type IconName } from "../components/ui/icons";
import {
  PageHero,
  PrimaryLink,
  SecondaryLink,
} from "../components/layout/PublicLayout";

const APPROACH: { icon: IconName; title: string; text: string }[] = [
  {
    icon: "assessment",
    title: "Assess",
    text: "Measure understanding at the topic level so the picture is specific, not vague.",
  },
  {
    icon: "compass",
    title: "Guide",
    text: "Turn results into a prioritized path so there is always a clear next step.",
  },
  {
    icon: "resources",
    title: "Support",
    text: "Pair each step with resources that match the gap it is meant to close.",
  },
  {
    icon: "progress",
    title: "Measure",
    text: "Confirm improvement with re-assessment rather than assumption.",
  },
];

export function AboutPage() {
  return (
    <>
      <PageHero eyebrow="About" title="What LearnBridge is">
        LearnBridge is a guided learning platform built around one idea: the fastest way to improve
        is to know precisely what you are missing, and to work on that first.
      </PageHero>

      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <div className="space-y-8">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">The problem</h2>
            <p className="mt-3 leading-relaxed text-slate-600">
              Most learning tools tell you how you did, but not what to do about it. A score on its
              own does not explain which topics you have mastered, which ones are holding you back,
              or where to spend your time next. That gap leaves learners studying blindly and
              guessing at their own progress.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">The idea</h2>
            <p className="mt-3 leading-relaxed text-slate-600">
              LearnBridge connects the dots. Assessments identify your learning gaps at a topic
              level. Those gaps become a personal plan that is ordered by priority. The plan points
              to matched resources, and re-assessment shows whether the gaps are actually closing.
              Diagnosis, guidance, and measurement live in one continuous loop.
            </p>
          </div>

          <blockquote className="lb-card border-l-4 border-brand-500 bg-[var(--lb-canvas)]">
            <p className="text-lg font-medium leading-relaxed text-slate-900">
              Know what you are missing, work on it in order, and measure that it worked.
            </p>
          </blockquote>

          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">Who it is for</h2>
            <p className="mt-3 leading-relaxed text-slate-600">
              LearnBridge is for learners who want direction rather than a pile of content — anyone
              preparing for a subject, returning to study, or working to shore up weak foundations.
              If you want to spend your time on what matters most, the loop is built for you.
            </p>
          </div>
        </div>
      </section>

      <section className="border-y border-[var(--lb-line)] bg-[var(--lb-canvas)]">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="max-w-2xl">
            <p className="lb-eyebrow">Our approach</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
              Four principles behind every feature.
            </h2>
          </div>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {APPROACH.map((item) => (
              <div key={item.title} className="lb-card">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                  <Icon name={item.icon} className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-[15px] font-semibold text-slate-900">{item.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 sm:py-20">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Learn with direction.
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-slate-600">
          Start your first diagnostic and see exactly where to focus.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <PrimaryLink to="/register">Get Started</PrimaryLink>
          <SecondaryLink to="/how-it-works">See how it works</SecondaryLink>
        </div>
      </section>
    </>
  );
}
