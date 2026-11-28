import Link from "next/link";
import type { BudgetProgress } from "@/lib/contracts";
import { crc } from "@/lib/format";
import { cx } from "./ui";

/**
 * Avance contra el presupuesto meta: lo gastado (tinta), lo que falta pagar de los
 * contratos (tinta clara) y lo libre. Si lo comprometido pasa la meta, se avisa.
 */
export function BudgetCard({ b, projectId, compact }: { b: BudgetProgress | null; projectId: string; compact?: boolean }) {
  if (!b) {
    return (
      <div className="rounded-card border border-dashed border-line-strong bg-surface/60 p-4 text-[14px] text-ink-2">
        Sin presupuesto meta.{" "}
        <Link href={`/p/${projectId}/ajustes#meta`} className="font-semibold text-brand underline">
          Ponerlo en Ajustes
        </Link>
      </div>
    );
  }
  const pct = (n: number) => `${Math.round(n * 100)} %`;
  const scale = Math.max(1, b.committedShare);
  const spentW = (b.spentShare / scale) * 100;
  const pendingW = ((b.committedShare - b.spentShare) / scale) * 100;
  return (
    <section className={cx("rounded-card border bg-surface", b.over ? "border-danger/30" : "border-line", compact ? "p-4" : "p-5 lg:p-6")} aria-label="Presupuesto meta">
      <p className={cx("text-ink-2", compact ? "text-[14px]" : "text-[15px]")}>
        Presupuesto meta <span className="tnum font-semibold text-ink">{crc(b.target)}</span>
      </p>
      <p className={cx("font-figure mt-1 font-semibold leading-none", compact ? "text-[26px]" : "text-[34px]")}>{pct(b.spentShare)} gastado</p>
      <div className="relative mt-4">
        <div className="flex h-3 w-full overflow-hidden rounded-full bg-sunken" aria-hidden>
          <div className="grow-x h-full bg-ink" style={{ width: `${spentW}%` }} />
          {pendingW > 0 && <div className="grow-x h-full border-l-2 border-surface bg-ink/35" style={{ width: `${pendingW}%` }} />}
        </div>
        {b.over && <span aria-hidden className="absolute -bottom-1 -top-1 w-0.5 rounded-full bg-danger" style={{ left: `${(1 / scale) * 100}%` }} />}
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-3 text-[13.5px]">
        <div>
          <dt className="flex items-center gap-1.5 text-ink-2">
            <span className="size-2.5 rounded-full bg-ink" aria-hidden />
            Gastado
          </dt>
          <dd className="tnum font-semibold">{crc(b.spent)}</dd>
        </div>
        <div>
          <dt className="flex items-center gap-1.5 text-ink-2">
            <span className="size-2.5 rounded-full bg-ink/35" aria-hidden />
            Falta a contratos
          </dt>
          <dd className="tnum font-semibold">{crc(b.committed - b.spent)}</dd>
        </div>
      </dl>
      <p className={cx("mt-3 border-t border-line pt-3 text-[14px]", b.over ? "font-semibold text-danger" : "text-ink-2")}>
        {b.over
          ? `Lo comprometido (${crc(b.committed)}) pasa la meta por ${crc(-b.remaining)}.`
          : `Comprometido ${crc(b.committed)} (${pct(b.committedShare)}). Quedan ${crc(b.remaining)} de la meta.`}
      </p>
    </section>
  );
}
