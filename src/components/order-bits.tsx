import Link from "next/link";
import type { OrderStatus } from "@prisma/client";
import { ChevronRight } from "lucide-react";
import { daysUntil } from "@/lib/compare";
import { dateKey, dateLabel, todayKey } from "@/lib/format";
import { cx } from "./ui";

export const STATUS_LABEL: Record<OrderStatus, string> = {
  POR_COTIZAR: "Por cotizar",
  COTIZADO: "Cotizado",
  COMPRADO: "Comprado",
  RECIBIDO: "Recibido",
  CANCELADO: "Cancelado",
};

const STATUS_TONE: Record<OrderStatus, string> = {
  POR_COTIZAR: "bg-sunken text-ink-2",
  COTIZADO: "bg-brand-soft text-brand",
  COMPRADO: "bg-ok-soft text-ok",
  RECIBIDO: "bg-ok text-white",
  CANCELADO: "bg-sunken text-ink-3 line-through",
};

export function StatusPill({ status }: { status: OrderStatus }) {
  return <span className={cx("inline-flex items-center rounded-full px-2.5 py-0.5 text-[12.5px] font-semibold", STATUS_TONE[status])}>{STATUS_LABEL[status]}</span>;
}

/** Pasos del pedido: por cotizar → cotizado → comprado → recibido */
export function StatusSteps({ status }: { status: OrderStatus }) {
  const steps: OrderStatus[] = ["POR_COTIZAR", "COTIZADO", "COMPRADO", "RECIBIDO"];
  const at = steps.indexOf(status);
  if (status === "CANCELADO") return <StatusPill status={status} />;
  return (
    <ol className="flex w-full items-center gap-1.5" aria-label={`Estado: ${STATUS_LABEL[status]}`}>
      {steps.map((s, i) => (
        <li key={s} className="flex min-w-0 flex-1 flex-col gap-1.5">
          <span aria-hidden className={cx("h-1.5 rounded-full", i <= at ? "bg-brand" : "bg-sunken")} />
          <span className={cx("truncate text-[12.5px]", i === at ? "font-semibold text-ink" : i < at ? "text-ink-2" : "text-ink-3")}>{STATUS_LABEL[s]}</span>
        </li>
      ))}
    </ol>
  );
}

/** Cuántos días faltan para la fecha en que el constructor necesita el material. */
export function deadline(neededBy: Date, status: OrderStatus) {
  const days = daysUntil(dateKey(neededBy), todayKey());
  const open = status === "POR_COTIZAR" || status === "COTIZADO";
  const label = days === 0 ? "Para hoy" : days === 1 ? "Para mañana" : days > 1 ? `En ${days} días` : days === -1 ? "Era para ayer" : `Atrasado ${-days} días`;
  const tone = !open ? "muted" : days <= 0 ? "danger" : days <= 3 ? "warn" : "neutral";
  return { days, label, tone, date: dateLabel(neededBy, { weekday: "short", day: "numeric", month: "short" }) } as const;
}

export function DeadlineBadge({ neededBy, status, size = "md" }: { neededBy: Date; status: OrderStatus; size?: "md" | "lg" }) {
  const d = deadline(neededBy, status);
  const tones = { danger: "bg-danger-soft text-danger", warn: "bg-warn-soft text-warn", neutral: "bg-sunken text-ink-2", muted: "bg-sunken text-ink-3" };
  return (
    <span className={cx("inline-flex flex-col rounded-control px-2.5 py-1 text-right leading-tight", tones[d.tone], size === "lg" && "px-3.5 py-2")}>
      <span className={cx("font-semibold", size === "lg" ? "text-[15px]" : "text-[13px]")}>{d.tone === "muted" ? d.date : d.label}</span>
      {d.tone !== "muted" && <span className={size === "lg" ? "text-[13px]" : "text-[12px]"}>{d.date}</span>}
    </span>
  );
}

export type OrderCardData = {
  id: string;
  number: number;
  title: string;
  status: OrderStatus;
  neededBy: Date;
  stage: { name: string } | null;
  _count: { lines: number; quotes: number };
};

export function OrderRow({ projectId, o }: { projectId: string; o: OrderCardData }) {
  return (
    <li>
      <Link href={`/p/${projectId}/pedidos/${o.id}`} className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-sunken/60">
        <span className="font-figure grid size-10 shrink-0 place-items-center rounded-full border border-line-strong text-[14px] font-semibold text-ink-2">{o.number}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15.5px] font-semibold">{o.title}</span>
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1 pt-0.5 text-[13px] text-ink-3">
            <StatusPill status={o.status} />
            <span>
              {o._count.lines} {o._count.lines === 1 ? "material" : "materiales"}
              {o._count.quotes > 0 && ` · ${o._count.quotes} ${o._count.quotes === 1 ? "cotización" : "cotizaciones"}`}
            </span>
          </span>
        </span>
        <DeadlineBadge neededBy={o.neededBy} status={o.status} />
        <ChevronRight className="hidden size-5 shrink-0 text-ink-3 sm:block" aria-hidden />
      </Link>
    </li>
  );
}
