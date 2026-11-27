import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { initials } from "@/lib/format";

export function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

/* Colores de billete. Clases completas para que Tailwind las genere. */
const NOTE_BG = ["bg-note-0", "bg-note-1", "bg-note-2", "bg-note-3", "bg-note-4"];
const NOTE_SOFT = ["bg-note-0-soft", "bg-note-1-soft", "bg-note-2-soft", "bg-note-3-soft", "bg-note-4-soft"];
const NOTE_TEXT = ["text-note-0", "text-note-1", "text-note-2", "text-note-3", "text-note-4"];

export function noteBg(color: number | "caja") {
  return color === "caja" ? "bg-caja" : NOTE_BG[color % NOTE_BG.length];
}
export function noteSoft(color: number | "caja") {
  return color === "caja" ? "bg-caja-soft" : NOTE_SOFT[color % NOTE_SOFT.length];
}
export function noteText(color: number | "caja") {
  return color === "caja" ? "text-caja" : NOTE_TEXT[color % NOTE_TEXT.length];
}

/** Ficha con la inicial de quien pagó, en el color de su billete. */
export function PayerChip({ name, color, size = "md" }: { name: string; color: number | "caja"; size?: "sm" | "md" | "lg" }) {
  const dim = size === "sm" ? "size-7 text-[11.5px]" : size === "lg" ? "size-11 text-[15px]" : "size-9 text-[13px]";
  return (
    <span aria-hidden className={cx("inline-grid shrink-0 place-items-center rounded-full font-semibold tracking-tight text-white", dim, noteBg(color))}>
      {color === "caja" ? "CC" : initials(name)}
    </span>
  );
}

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
const BUTTON: Record<ButtonVariant, string> = {
  primary: "bg-brand text-white hover:bg-brand-strong active:translate-y-px shadow-raise",
  secondary: "bg-surface text-ink border border-line-strong hover:border-ink-3 hover:bg-sunken/60 active:translate-y-px",
  ghost: "text-brand hover:bg-brand-soft",
  danger: "bg-surface text-danger border border-danger/40 hover:bg-danger-soft",
};
const BUTTON_BASE =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-control px-4 text-[15px] font-semibold transition-[background-color,border-color,transform] duration-150 disabled:pointer-events-none disabled:opacity-55";

export function Button({ variant = "primary", className, ...props }: ComponentProps<"button"> & { variant?: ButtonVariant }) {
  return <button className={cx(BUTTON_BASE, BUTTON[variant], className)} {...props} />;
}

export function ButtonLink({ variant = "primary", className, ...props }: ComponentProps<typeof Link> & { variant?: ButtonVariant }) {
  return <Link className={cx(BUTTON_BASE, BUTTON[variant], className)} {...props} />;
}

export function Card({ className, children, ...props }: ComponentProps<"section">) {
  return (
    <section className={cx("rounded-card border border-line bg-surface", className)} {...props}>
      {children}
    </section>
  );
}

export function PageHeader({ title, description, action }: { title: string; description?: ReactNode; action?: ReactNode }) {
  return (
    <header className="flex items-start justify-between gap-3 pb-5 pt-2">
      <div className="min-w-0">
        <h1 className="text-balance text-[26px] font-semibold leading-tight tracking-[-0.02em] lg:text-[30px]">{title}</h1>
        {description && <p className="mt-1 text-[15px] text-ink-2">{description}</p>}
      </div>
      {action}
    </header>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 mt-8 flex items-baseline justify-between gap-3 first:mt-0">
      <h2 className="text-[17px] font-semibold tracking-[-0.01em]">{children}</h2>
      {action}
    </div>
  );
}

export function Field({ label, hint, error, children, htmlFor }: { label: string; hint?: ReactNode; error?: string; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-[14px] font-semibold text-ink">
        {label}
      </label>
      {children}
      {hint && !error && <p className="text-[13px] text-ink-3">{hint}</p>}
      {error && <p className="text-[13px] font-medium text-danger">{error}</p>}
    </div>
  );
}

export const inputClass =
  "block w-full min-h-12 rounded-control border border-line-strong bg-surface px-3.5 text-[16px] text-ink placeholder:text-ink-3 transition-colors focus:border-brand focus:outline-none focus:ring-3 focus:ring-brand/15 disabled:bg-sunken";

export function Input(props: ComponentProps<"input">) {
  return <input {...props} className={cx(inputClass, props.className)} />;
}

export function Select(props: ComponentProps<"select">) {
  return <select {...props} className={cx(inputClass, "appearance-none bg-[length:16px] bg-[right_12px_center] bg-no-repeat pr-10", props.className)} style={{ backgroundImage: CHEVRON, ...props.style }} />;
}

const CHEVRON = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%234b5a54' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`;

export function Textarea(props: ComponentProps<"textarea">) {
  return <textarea {...props} className={cx(inputClass, "min-h-24 py-3", props.className)} />;
}

export function Badge({ tone = "neutral", children }: { tone?: "neutral" | "warn" | "danger" | "ok" | "brand"; children: ReactNode }) {
  const tones = {
    neutral: "bg-sunken text-ink-2",
    warn: "bg-warn-soft text-warn",
    danger: "bg-danger-soft text-danger",
    ok: "bg-ok-soft text-ok",
    brand: "bg-brand-soft text-brand",
  };
  return <span className={cx("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[12.5px] font-semibold", tones[tone])}>{children}</span>;
}

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="rounded-card border border-dashed border-line-strong bg-surface/60 px-5 py-10 text-center">
      <p className="text-[16px] font-semibold">{title}</p>
      {children && <p className="mx-auto mt-1.5 max-w-[42ch] text-[14.5px] text-ink-2">{children}</p>}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

export function Notice({ tone = "warn", children }: { tone?: "warn" | "danger" | "ok" | "brand"; children: ReactNode }) {
  const tones = {
    warn: "bg-warn-soft text-warn border-warn/25",
    danger: "bg-danger-soft text-danger border-danger/25",
    ok: "bg-ok-soft text-ok border-ok/25",
    brand: "bg-brand-soft text-brand border-brand/20",
  };
  return <div className={cx("rounded-control border px-4 py-3 text-[14.5px] font-medium", tones[tone])}>{children}</div>;
}
