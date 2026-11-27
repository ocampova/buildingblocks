"use client";

import { useActionState, useEffect, useRef, type ReactNode } from "react";
import { Button, cx } from "./ui";

export type ActionState = { error?: string; ok?: string; fields?: Record<string, string> };

/** Formulario con mensaje de error y de éxito para una server action. */
export function ActionForm({
  action,
  submitLabel,
  pendingLabel = "Guardando…",
  children,
  className,
  resetOnOk = true,
  variant = "primary",
  fullWidth,
}: {
  action: (prev: ActionState, form: FormData) => Promise<ActionState>;
  submitLabel: string;
  pendingLabel?: string;
  children: ReactNode;
  className?: string;
  resetOnOk?: boolean;
  variant?: "primary" | "secondary" | "danger";
  fullWidth?: boolean;
}) {
  const ref = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, {});
  useEffect(() => {
    if (state.ok && resetOnOk) ref.current?.reset();
  }, [state, resetOnOk]);
  return (
    <form ref={ref} action={formAction} className={cx("space-y-4", className)}>
      {children}
      {state.error && (
        <p role="alert" className="rounded-control bg-danger-soft px-3.5 py-2.5 text-[14px] font-medium text-danger">
          {state.error}
        </p>
      )}
      {state.ok && (
        <p role="status" className="rise rounded-control bg-ok-soft px-3.5 py-2.5 text-[14px] font-medium text-ok">
          {state.ok}
        </p>
      )}
      <Button type="submit" variant={variant} disabled={pending} className={cx(fullWidth && "w-full")}>
        {pending ? pendingLabel : submitLabel}
      </Button>
    </form>
  );
}
