import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { ActionForm, type ActionState } from "./action-form";
import { cx, Field, Input, noteBg, Select, Textarea } from "./ui";
import type { ContractSummary } from "@/lib/contracts";
import { crc, dateKey, grouped } from "@/lib/format";

type PaidBy = { amount: number; source: "SOCIO" | "CAJA"; partner: { color: number; user: { name: string } } | null };

/**
 * Barra del contrato: lo abonado partido por quién pagó (colores de billete),
 * y lo que falta en gris.
 */
export function ContractBar({ summary, payments, height = "h-3" }: { summary: ContractSummary; payments: PaidBy[]; height?: string }) {
  const total = Math.max(summary.total, summary.paid) || 1;
  const bySource = new Map<string, { color: number | "caja"; amount: number }>();
  for (const p of payments) {
    const key = p.source === "CAJA" ? "caja" : p.partner!.user.name;
    const prev = bySource.get(key);
    bySource.set(key, { color: p.source === "CAJA" ? "caja" : p.partner!.color, amount: (prev?.amount ?? 0) + p.amount });
  }
  return (
    <div className={cx("flex w-full overflow-hidden rounded-full bg-sunken", height)} role="img" aria-label={`Abonado ${crc(summary.paid)} de ${crc(summary.total)}`}>
      {[...bySource.values()].map((s, i) => (
        <div key={i} className={cx("grow-x h-full", noteBg(s.color), i > 0 && "border-l-2 border-surface")} style={{ width: `${(s.amount / total) * 100}%` }} />
      ))}
    </div>
  );
}

export type ContractCardData = {
  id: string;
  contractor: string;
  description: string;
  summary: ContractSummary;
  expenses: { payments: PaidBy[] }[];
};

export function ContractCard({ projectId, c }: { projectId: string; c: ContractCardData }) {
  return (
    <Link href={`/p/${projectId}/contratos/${c.id}`} className="block rounded-card border border-line bg-surface p-4 transition-colors hover:border-line-strong sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[16px] font-semibold">{c.contractor}</p>
          <p className="truncate text-[14px] text-ink-2">{c.description}</p>
        </div>
        <ChevronRight className="mt-1 size-5 shrink-0 text-ink-3" aria-hidden />
      </div>
      <p className="mt-3 text-[14.5px] text-ink-2">
        Saldo <span className="font-figure text-[20px] font-semibold text-ink">{crc(c.summary.balance)}</span> de {crc(c.summary.total)}
      </p>
      <div className="mt-2">
        <ContractBar summary={c.summary} payments={c.expenses.flatMap((e) => e.payments)} height="h-2.5" />
      </div>
      <p className="tnum mt-2 text-[13px] text-ink-3">
        Abonado {crc(c.summary.paid)} ({Math.round(c.summary.progress * 100)} %){c.summary.extras > 0 ? ` · adicionales ${crc(c.summary.extras)}` : ""}
      </p>
    </Link>
  );
}

export function ContractForm({
  action,
  stages,
  initial,
  submitLabel,
}: {
  action: (p: ActionState, f: FormData) => Promise<ActionState>;
  stages: { id: string; name: string }[];
  initial?: { contractor: string; description: string; amount: number; signedAt: Date | null; stageId: string | null; notes: string | null };
  submitLabel: string;
}) {
  return (
    <ActionForm action={action} submitLabel={submitLabel} resetOnOk={false}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Con quién" htmlFor="contractor" hint="Constructor, empresa o persona">
          <Input id="contractor" name="contractor" defaultValue={initial?.contractor} required />
        </Field>
        <Field label="Qué cubre" htmlFor="cdesc" hint="Ej.: Mano de obra de toda la construcción">
          <Input id="cdesc" name="description" defaultValue={initial?.description} required />
        </Field>
        <Field label="Monto contratado" htmlFor="camount">
          <Input id="camount" name="amount" inputMode="numeric" defaultValue={initial ? grouped(initial.amount) : ""} placeholder="₡" required />
        </Field>
        <Field label="Fecha del contrato" htmlFor="csigned" hint="Opcional">
          <Input id="csigned" name="signedAt" type="date" defaultValue={initial?.signedAt ? dateKey(initial.signedAt) : ""} />
        </Field>
        <Field label="Etapa de los abonos" htmlFor="cstage" hint="Dónde se registran los abonos por defecto. Se puede cambiar en cada abono.">
          <Select id="cstage" name="stageId" defaultValue={initial?.stageId ?? ""}>
            <option value="">Elegir en cada abono</option>
            {stages.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="Notas" htmlFor="cnotes" hint="Opcional. Ej.: forma de pago acordada, retenciones">
        <Textarea id="cnotes" name="notes" defaultValue={initial?.notes ?? ""} />
      </Field>
    </ActionForm>
  );
}
