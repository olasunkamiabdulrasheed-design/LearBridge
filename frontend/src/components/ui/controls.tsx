import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "danger" | "dark";

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    "bg-brand-500 text-white shadow-sm hover:bg-brand-600 active:bg-brand-700",
  secondary:
    "border border-slate-300 bg-white text-slate-700 shadow-sm hover:bg-slate-50 active:bg-slate-100",
  danger: "bg-red-700 text-white shadow-sm hover:bg-red-800 active:bg-red-900",
  dark: "bg-slate-900 text-white shadow-sm hover:bg-slate-700 active:bg-slate-800",
};

const SIZES = {
  sm: "h-8 px-3 text-[13px]",
  md: "h-10 px-4 text-sm",
} as const;

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: keyof typeof SIZES;
  children: ReactNode;
}

/** Standardized button. Visual only — behavior unchanged from native button. */
export function Button({
  variant = "primary",
  size = "md",
  children,
  className = "",
  ...rest
}: ButtonProps) {
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${VARIANT_CLASSES[variant]} ${SIZES[size]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1.5 block font-medium text-slate-700">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-[13px] text-slate-500">{hint}</span>}
    </label>
  );
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`lb-input ${props.className ?? ""}`} />;
}

export function SelectInput(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`lb-input ${props.className ?? ""}`} />;
}
