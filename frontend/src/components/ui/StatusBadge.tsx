const STATUS_STYLES: Array<[RegExp, string]> = [
  [/^(completed|succeeded|resolved)$/, "bg-emerald-50 text-emerald-700 ring-emerald-600/20"],
  [/^(failed)$/, "bg-red-50 text-red-700 ring-red-600/20"],
  [/^(in_progress|active)$/, "bg-brand-50 text-brand-700 ring-brand-600/20"],
  [/^(pending|open|not_started|paused)$/, "bg-slate-100 text-slate-600 ring-slate-500/20"],
];

/** Consistent status indicator. Unknown statuses fall back to neutral. */
export function StatusBadge({ status }: { status: string }) {
  const match = STATUS_STYLES.find(([re]) => re.test(status));
  const color = match ? match[1] : "bg-slate-100 text-slate-600 ring-slate-500/20";
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${color}`}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}
