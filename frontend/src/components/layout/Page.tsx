import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  action,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div className="min-w-0 max-w-2xl">
        {eyebrow && <p className="lb-eyebrow">{eyebrow}</p>}
        <h1 className="mt-1 text-[26px] font-bold leading-tight tracking-tight text-slate-900 sm:text-3xl">
          {title}
        </h1>
        {subtitle && <p className="mt-1.5 text-[15px] leading-relaxed text-slate-600">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function Card({
  title,
  description,
  action,
  children,
  padded = true,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children?: ReactNode;
  padded?: boolean;
}) {
  return (
    <section className={`lb-card ${padded ? "" : "p-0 overflow-hidden"}`}>
      <div className={`flex flex-wrap items-start justify-between gap-2 ${padded ? "" : "px-5 pt-5 sm:px-6 sm:pt-6"}`}>
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold leading-snug text-slate-900">{title}</h2>
          {description && <p className="mt-0.5 text-sm leading-relaxed text-slate-600">{description}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {children && <div className={padded ? "mt-4" : "mt-4 px-5 pb-5 sm:px-6 sm:pb-6"}>{children}</div>}
    </section>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <h3 className="text-sm font-semibold text-slate-900">{children}</h3>;
}
