import Link from "next/link";
import { Paperclip } from "lucide-react";
import { crc, firstName, relativeDay } from "@/lib/format";
import { cx, noteBg, PayerChip } from "./ui";

export type ExpenseRowData = {
  id: string;
  date: Date;
  description: string;
  supplier: string | null;
  total: number;
  dueDate: Date | null;
  stage: { name: string };
  payments: { amount: number; source: "SOCIO" | "CAJA"; partner: { id: string; color: number; user: { name: string } } | null }[];
  _count: { attachments: number };
};

/** Quién pagó: una ficha si fue una sola fuente; fichas superpuestas si se dividió. */
function PayerStack({ e }: { e: ExpenseRowData }) {
  const sources = new Map<string, { name: string; color: number | "caja" }>();
  for (const p of e.payments) {
    if (p.source === "CAJA") sources.set("caja", { name: "Caja chica", color: "caja" });
    else if (p.partner) sources.set(p.partner.id, { name: p.partner.user.name, color: p.partner.color });
  }
  const list = [...sources.values()];
  if (list.length === 0) return <span aria-hidden className="size-8 shrink-0 rounded-full border-2 border-dashed border-line-strong" />;
  if (list.length === 1) return <PayerChip name={list[0].name} color={list[0].color} />;
  return (
    <span aria-hidden className="relative size-8 shrink-0">
      {list.slice(0, 2).map((s, i) => (
        <span key={i} className={cx("absolute size-6 rounded-full ring-2 ring-surface", noteBg(s.color), i === 0 ? "left-0 top-0" : "bottom-0 right-0")} />
      ))}
    </span>
  );
}

export function payerLabel(e: ExpenseRowData) {
  const paid = e.payments.reduce((s, p) => s + p.amount, 0);
  const names = [...new Set(e.payments.map((p) => (p.source === "CAJA" ? "Caja chica" : p.partner ? firstName(p.partner.user.name) : "")))].filter(Boolean);
  if (paid === 0) return "Por pagar";
  const who = names.join(" y ");
  return paid < e.total ? `${who}, parcial` : who;
}

export function ExpenseRow({ projectId, e }: { projectId: string; e: ExpenseRowData }) {
  const paid = e.payments.reduce((s, p) => s + p.amount, 0);
  const pending = e.total - paid;
  return (
    <li>
      <Link href={`/p/${projectId}/gastos/${e.id}`} className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-sunken/60">
        <PayerStack e={e} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15.5px] font-semibold leading-snug">{e.description}</p>
          <p className="truncate text-[13.5px] text-ink-3">
            {e.stage.name} · {payerLabel(e)}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="tnum text-[15.5px] font-semibold">{crc(e.total)}</p>
          <p className={cx("flex items-center justify-end gap-1 text-[13px]", pending > 0 ? "font-semibold text-warn" : "text-ink-3")}>
            {e._count.attachments === 0 && pending === 0 && <span className="sr-only">Sin respaldo.</span>}
            {e._count.attachments > 0 && <Paperclip className="size-3.5" aria-label="Con respaldo" />}
            {pending > 0 ? `Debe ${crc(pending)}` : relativeDay(e.date)}
          </p>
        </div>
      </Link>
    </li>
  );
}
