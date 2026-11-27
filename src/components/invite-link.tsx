"use client";

import { useActionState, useState } from "react";
import { Check, Copy, MessageCircle } from "lucide-react";
import type { ActionState } from "./action-form";
import { Button } from "./ui";

/** Muestra un enlace de invitación con botones para copiarlo o mandarlo por WhatsApp. */
export function LinkResult({ state }: { state: ActionState }) {
  const [copied, setCopied] = useState(false);
  const link = state.fields?.link;
  if (!state.ok) return null;
  return (
    <div className="rise space-y-2.5 rounded-control border border-ok/25 bg-ok-soft p-3.5">
      <p className="text-[14px] font-medium text-ok">{state.ok}</p>
      {link && (
        <>
          <p className="break-all rounded-md bg-surface px-3 py-2 font-mono text-[12.5px] text-ink">{link}</p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={async () => {
                await navigator.clipboard.writeText(link);
                setCopied(true);
              }}
            >
              {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
              {copied ? "Copiado" : "Copiar"}
            </Button>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`Hola ${state.fields?.name?.split(" ")[0] ?? ""}, este es el enlace para entrar a Obra, donde llevamos los gastos de la construcción: ${link}`)}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 items-center gap-2 rounded-control border border-line-strong bg-surface px-4 text-[15px] font-semibold hover:border-ink-3"
            >
              <MessageCircle className="size-4" aria-hidden /> WhatsApp
            </a>
          </div>
          <p className="text-[12.5px] text-ok">El enlace sirve una sola vez y vence en 14 días.</p>
        </>
      )}
    </div>
  );
}

export function InviteForm({ action, children, submitLabel = "Invitar" }: { action: (p: ActionState, f: FormData) => Promise<ActionState>; children?: React.ReactNode; submitLabel?: string }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, {});
  return (
    <form action={formAction} className="space-y-4">
      {children}
      {state.error && <p role="alert" className="rounded-control bg-danger-soft px-3.5 py-2.5 text-[14px] font-medium text-danger">{state.error}</p>}
      <LinkResult state={state} />
      <Button type="submit" variant={children ? "primary" : "secondary"} disabled={pending}>{pending ? "Generando…" : submitLabel}</Button>
    </form>
  );
}
