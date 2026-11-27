"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import type { ActionState } from "./action-form";
import { Button, cx, Field, Input, inputClass, PayerChip } from "./ui";
import { groupDigits } from "./upload";
import { suggestTopUp, type Ledger } from "@/lib/ledger";

type Partner = { id: string; name: string; color: number };

/**
 * Recarga de la caja chica. Al escribir cuánto se va a meter, propone cuánto pone cada
 * socio para que además las cuentas queden parejas. Cada monto se puede cambiar.
 */
export function TopUpForm({ partners, ledger, today, action }: { partners: Partner[]; ledger: Ledger; today: string; action: (p: ActionState, f: FormData) => Promise<ActionState> }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, {});
  const [total, setTotal] = useState("");
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const ref = useRef<HTMLFormElement>(null);
  const n = Number(total.replace(/\D/g, "")) || 0;
  const suggestion = useMemo(() => suggestTopUp(ledger, n), [ledger, n]);

  useEffect(() => {
    setAmounts(Object.fromEntries(suggestion.map((s) => [s.partnerId, s.amount ? groupDigits(String(s.amount)) : ""])));
  }, [suggestion]);
  useEffect(() => {
    if (state.ok) {
      ref.current?.reset();
      setTotal("");
    }
  }, [state]);

  const uneven = suggestion.some((s) => s.amount === 0) && n > 0;

  return (
    <form ref={ref} action={formAction} className="space-y-4">
      <Field label="¿Cuánto van a meter a la caja?" htmlFor="topup">
        <div className="relative">
          <span aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[18px] font-semibold text-ink-3">₡</span>
          <input id="topup" inputMode="numeric" value={total} onChange={(e) => setTotal(groupDigits(e.target.value))} placeholder="0" className={cx(inputClass, "tnum pl-8 text-[18px] font-semibold")} />
        </div>
      </Field>
      <div className="space-y-2.5">
        <p className="text-[14px] font-semibold">Cada uno deposita</p>
        {partners.map((p) => (
          <label key={p.id} className="flex items-center gap-3">
            <PayerChip name={p.name} color={p.color} size="sm" />
            <span className="w-24 shrink-0 text-[15px] font-medium">{p.name.split(" ")[0]}</span>
            <span className="relative flex-1">
              <span aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 font-semibold text-ink-3">₡</span>
              <input
                name={`amount:${p.id}`}
                inputMode="numeric"
                value={amounts[p.id] ?? ""}
                onChange={(e) => setAmounts((a) => ({ ...a, [p.id]: groupDigits(e.target.value) }))}
                placeholder="0"
                aria-label={`Monto que deposita ${p.name}`}
                className={cx(inputClass, "tnum pl-8 font-semibold")}
              />
            </span>
          </label>
        ))}
        {n > 0 && <p className="text-[13.5px] text-ink-2">{uneven ? "Propuesto para que además queden parejos. Puede cambiar los montos." : "Propuesto según el porcentaje de cada uno. Puede cambiar los montos."}</p>}
      </div>
      <Field label="Fecha" htmlFor="ddate">
        <Input id="ddate" name="date" type="date" defaultValue={today} max={today} className="max-w-[220px]" />
      </Field>
      {state.error && <p role="alert" className="rounded-control bg-danger-soft px-3.5 py-2.5 text-[14px] font-medium text-danger">{state.error}</p>}
      {state.ok && <p role="status" className="rise rounded-control bg-ok-soft px-3.5 py-2.5 text-[14px] font-medium text-ok">{state.ok}</p>}
      <Button type="submit" disabled={pending}>{pending ? "Guardando…" : "Registrar depósito"}</Button>
    </form>
  );
}
