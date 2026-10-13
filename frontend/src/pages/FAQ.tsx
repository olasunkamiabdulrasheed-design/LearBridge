import { useState } from "react";
import { Link } from "react-router-dom";
import { Icon } from "../components/ui/icons";
import { PageHero, PrimaryLink } from "../components/layout/PublicLayout";

const FAQS: { q: string; a: string }[] = [
  {
    q: "What is LearnBridge?",
    a: "LearnBridge is a guided learning platform that helps you find your learning gaps, build a personal study plan, study with matched resources, and measure your improvement over time.",
  },
  {
    q: "How does the learning journey work?",
    a: "It runs as a repeating loop: take a diagnostic assessment, review your results, get a plan built from your gaps, study with matched resources, then re-assess to confirm progress. You can restart the loop whenever you want.",
  },
  {
    q: "What do the assessments do?",
    a: "Assessments measure your understanding topic by topic rather than giving a single overall score. This produces the detailed picture of what you have mastered and what still needs work.",
  },
  {
    q: "What are learning gaps?",
    a: "Learning gaps are the specific topics and skills your assessment results show you have not mastered yet. LearnBridge identifies them and uses them to build your study plan.",
  },
  {
    q: "What does the Study Agent do?",
    a: "The Study Agent is an assistant you can ask about your results and what to study next. It helps connect your gaps to concrete next steps in your plan.",
  },
  {
    q: "What is a learning plan?",
    a: "Your learning plan is a prioritized sequence of study steps generated from your own assessment results. It keeps your effort ordered so you always know what to work on next.",
  },
  {
    q: "How do resources fit in?",
    a: "Resources are study materials matched to the gaps and steps in your plan. As you work through them, your plan updates so your effort stays focused on what needs it most.",
  },
  {
    q: "Can I track my progress?",
    a: "Yes. By re-taking assessments you can compare before and after and see your improvement over time. Progress is measured, not guessed.",
  },
  {
    q: "Do I need an account to use LearnBridge?",
    a: "Yes. An account gives you a personal space to keep your diagnostics, plans, resources, and progress, so every session continues from where you left off.",
  },
  {
    q: "I already have an account. How do I sign in?",
    a: "Use the Log in link in the navigation to sign in with your username and password, and you will return straight to your dashboard.",
  },
];

export function FAQPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <>
      <PageHero eyebrow="FAQ" title="Questions, answered">
        Everything you need to know about how LearnBridge works and how to get started.
      </PageHero>

      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <div className="divide-y divide-[var(--lb-line)] border-y border-[var(--lb-line)]">
          {FAQS.map((item, i) => {
            const open = openIndex === i;
            return (
              <div key={item.q}>
                <h2>
                  <button
                    type="button"
                    id={`faq-button-${i}`}
                    aria-expanded={open}
                    aria-controls={`faq-panel-${i}`}
                    onClick={() => setOpenIndex(open ? null : i)}
                    className="flex w-full items-center justify-between gap-4 py-5 text-left"
                  >
                    <span className="text-[15px] font-semibold text-slate-900">{item.q}</span>
                    <Icon
                      name="chevronDown"
                      className={`h-5 w-5 shrink-0 text-slate-400 transition-transform ${
                        open ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                </h2>
                {open && (
                  <div
                    id={`faq-panel-${i}`}
                    role="region"
                    aria-labelledby={`faq-button-${i}`}
                    className="pb-5 pr-8 text-sm leading-relaxed text-slate-600"
                  >
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="border-t border-[var(--lb-line)] bg-[var(--lb-canvas)]">
        <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 sm:py-20">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Still have questions?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-slate-600">
            The best way to understand LearnBridge is to try it. Create an account and take your
            first diagnostic. You can also{" "}
            <Link to="/how-it-works" className="font-medium text-brand-600 hover:underline">
              see how it works
            </Link>
            .
          </p>
          <div className="mt-6 flex justify-center">
            <PrimaryLink to="/register">Get Started</PrimaryLink>
          </div>
        </div>
      </section>
    </>
  );
}
