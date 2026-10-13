import { Icon, type IconName } from "../components/ui/icons";
import {
  PageHero,
  PrimaryLink,
  SecondaryLink,
} from "../components/layout/PublicLayout";

const FEATURES: {
  icon: IconName;
  title: string;
  what: string;
  why: string;
  fit: string;
  points: string[];
}[] = [
  {
    icon: "assessment",
    title: "Diagnostic assessments",
    what: "Short assessments that measure your understanding topic by topic instead of as a single score.",
    why: "A single grade hides which topics you have actually mastered and which ones still need work.",
    fit: "They are the starting point of the loop — the raw signal everything else is built from.",
    points: ["Topic-level detail", "Short to complete", "Re-take any time"],
  },
  {
    icon: "report",
    title: "Results and reports",
    what: "Readable breakdowns of your performance, showing correct and incorrect areas clearly.",
    why: "You learn more from seeing where answers went wrong than from a number alone.",
    fit: "Reports turn assessment data into something you can act on.",
    points: ["Per-question review", "Clear summaries", "Revisit later"],
  },
  {
    icon: "target",
    title: "Learning gap detection",
    what: "Identifies the specific topics and skills your results show you have not mastered yet.",
    why: "Naming your gaps precisely means you study the right thing instead of everything.",
    fit: "Detected gaps are what your personal plan is built to close.",
    points: ["Pinpoints weak spots", "Prioritized by importance", "Updates as you learn"],
  },
  {
    icon: "agent",
    title: "Study Agent guidance",
    what: "An assistant you can ask about your results and what to study next.",
    why: "Direction reduces the time lost deciding what to do next.",
    fit: "It connects your gaps to concrete next steps in your plan.",
    points: ["Answers about your results", "Suggests next steps", "Stays tied to your data"],
  },
  {
    icon: "plan",
    title: "Personal learning plan",
    what: "A prioritized sequence of study steps generated from your own assessment results.",
    why: "A plan removes guesswork and keeps your effort ordered and focused.",
    fit: "It is the bridge between knowing your gaps and closing them.",
    points: ["Ordered steps", "Based on your results", "Adapts as you progress"],
  },
  {
    icon: "resources",
    title: "Matched resources",
    what: "Study materials matched to the gaps and steps in your plan.",
    why: "Relevant material is faster to work through than a generic list.",
    fit: "Resources are where the plan turns into actual study time.",
    points: ["Matched to your plan", "Focused on gaps", "Marked as you complete"],
  },
  {
    icon: "progress",
    title: "Progress tracking",
    what: "A running view of how your understanding changes as you work through your plan.",
    why: "Seeing progress keeps motivation up and confirms your effort is working.",
    fit: "It closes the loop and shows whether gaps are genuinely closing.",
    points: ["Before/after comparison", "Visible over time", "Measured, not guessed"],
  },
];

export function FeaturesPage() {
  return (
    <>
      <PageHero eyebrow="Features" title="Tools built around how you actually learn">
        Every feature exists to answer one question: what should I learn next, and is it working?
      </PageHero>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <a
              key={feature.title}
              href={`#${feature.title.toLowerCase().replace(/\s+/g, "-")}`}
              className="lb-card transition-shadow hover:shadow-md"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                <Icon name={feature.icon} className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-[15px] font-semibold text-slate-900">{feature.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">{feature.what}</p>
            </a>
          ))}
        </div>
      </section>

      <div className="border-t border-[var(--lb-line)]">
        {FEATURES.map((feature, i) => (
          <section
            key={feature.title}
            id={feature.title.toLowerCase().replace(/\s+/g, "-")}
            className={i % 2 === 0 ? "bg-white" : "bg-[var(--lb-canvas)]"}
          >
            <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 sm:px-6 lg:grid-cols-2">
              <div className={i % 2 === 0 ? "lg:order-1" : "lg:order-2"}>
                <p className="lb-eyebrow">Feature</p>
                <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
                  {feature.title}
                </h2>
                <p className="mt-3 leading-relaxed text-slate-600">{feature.what}</p>
                <dl className="mt-6 space-y-4">
                  <div>
                    <dt className="text-sm font-semibold text-slate-900">Why it matters</dt>
                    <dd className="mt-0.5 text-sm leading-relaxed text-slate-600">{feature.why}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-semibold text-slate-900">How it fits</dt>
                    <dd className="mt-0.5 text-sm leading-relaxed text-slate-600">{feature.fit}</dd>
                  </div>
                </dl>
              </div>

              <div className={i % 2 === 0 ? "lg:order-2" : "lg:order-1"}>
                <div className="lb-card bg-gradient-to-br from-brand-50 to-white">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-500 text-white shadow-sm">
                    <Icon name={feature.icon} className="h-6 w-6" />
                  </span>
                  <ul className="mt-5 space-y-3">
                    {feature.points.map((point) => (
                      <li key={point} className="flex items-center gap-2.5 text-sm text-slate-700">
                        <Icon name="check" className="h-4 w-4 shrink-0 text-brand-600" />
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </section>
        ))}
      </div>

      <section className="border-t border-[var(--lb-line)]">
        <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 sm:py-20">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            See the tools in action.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-slate-600">
            Create an account and put each feature to work on your own learning.
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <PrimaryLink to="/register">Get Started</PrimaryLink>
            <SecondaryLink to="/how-it-works">See how it works</SecondaryLink>
          </div>
        </div>
      </section>
    </>
  );
}
