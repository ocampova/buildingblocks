import type { Metadata } from "next";
import { ExportButton } from "@/components/export-button";
import { BudgetCard } from "@/components/budget-card";
import { ContractCard } from "@/components/contract-bits";
import { getBudget, getContracts } from "@/lib/data";
import Link from "next/link";
import { Card, cx, EmptyState, noteBg, PageHeader, SectionTitle } from "@/components/ui";
import { requireMoneyMember } from "@/lib/auth";
import { getPartners } from "@/lib/data";
import { prisma } from "@/lib/db";
import { crc, dateLabel, firstName, keyToDate, todayKey } from "@/lib/format";

export const metadata: Metadata = { title: "Resumen" };

export default async function Summary({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  // Solo socios y administración: el constructor no ve gastos
  await requireMoneyMember(projectId);
  const money = true;
  const [budget, contracts] = await Promise.all([getBudget(projectId), getContracts(projectId)]);
  const [stages, expenses, partners] = await Promise.all([
    prisma.stage.findMany({ where: { projectId }, orderBy: { position: "asc" } }),
    prisma.expense.findMany({ where: { projectId }, select: { id: true, stageId: true, total: true, receiptType: true, dueDate: true, description: true, payments: { select: { amount: true, source: true, partnerId: true } } } }),
    getPartners(projectId),
  ]);

  const byStage = stages.map((s) => {
    const items = expenses.filter((e) => e.stageId === s.id);
    const spent = items.reduce((a, e) => a + e.total, 0);
    const paid = items.reduce((a, e) => a + e.payments.reduce((b, p) => b + p.amount, 0), 0);
    const bySource = partners.map((p) => ({
      id: p.id,
      name: p.user.name,
      color: p.color,
      share: p.share ?? 0,
      balance: 0,
      contributed: items.reduce((a, e) => a + e.payments.filter((x) => x.source === "SOCIO" && x.partnerId === p.id).reduce((b, x) => b + x.amount, 0), 0),
    }));
    const fromCash = items.reduce((a, e) => a + e.payments.filter((x) => x.source === "CAJA").reduce((b, x) => b + x.amount, 0), 0);
    return { ...s, count: items.length, spent, paid, pending: spent - paid, bySource, fromCash };
  });
  const total = byStage.reduce((a, s) => a + s.spent, 0);
  const obra = byStage.filter((s) => s.kind === "OBRA").reduce((a, s) => a + s.spent, 0);
  const general = total - obra;
  const pendingTotal = byStage.reduce((a, s) => a + s.pending, 0);
  const withInvoice = expenses.filter((e) => e.receiptType === "FACTURA").reduce((a, e) => a + e.total, 0);
  const noReceipt = expenses.filter((e) => e.receiptType === "NINGUNO");
  const maxSpent = Math.max(1, ...byStage.map((s) => s.spent));
  const today = keyToDate(todayKey());
  const upcoming = expenses
    .filter((e) => e.dueDate && e.payments.reduce((b, p) => b + p.amount, 0) < e.total)
    .sort((a, b) => a.dueDate!.getTime() - b.dueDate!.getTime());

  if (expenses.length === 0) {
    return (
      <div>
        <PageHeader title="Resumen" />
        <EmptyState title="Todavía no hay gastos">Cuando se registren gastos, aquí se ve cuánto lleva cada etapa.</EmptyState>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Resumen" description="Cuánto se ha gastado por etapa y lo que falta por pagar." action={<ExportButton projectId={projectId} />} />

      <Card className="p-5 lg:p-6">
        <p className="max-w-[46ch] text-balance text-[19px] leading-snug text-ink-2 lg:text-[21px]">
          Llevan <span className="font-figure font-semibold text-ink">{crc(total)}</span>: {crc(obra)} en la obra y {crc(general)} en gastos generales
          {money && pendingTotal > 0 ? (
            <>
              . Falta pagar <span className="font-semibold text-warn">{crc(pendingTotal)}</span>.
            </>
          ) : (
            "."
          )}
        </p>
        <div className="mt-5 flex h-3 w-full overflow-hidden rounded-full bg-sunken" aria-hidden>
          <div className="grow-x h-full bg-ink" style={{ width: `${total ? (obra / total) * 100 : 0}%` }} />
          <div className="grow-x h-full border-l-2 border-surface bg-ink/35" style={{ width: `${total ? (general / total) * 100 : 0}%` }} />
        </div>
        <div className="mt-2 flex gap-4 text-[13px] text-ink-2">
          <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-ink" aria-hidden />Obra</span>
          <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-ink/35" aria-hidden />Gastos generales</span>
        </div>
      </Card>

      <div className="mt-4">
        <BudgetCard b={budget} projectId={projectId} />
      </div>

      <SectionTitle
        action={
          <Link href={`/p/${projectId}/contratos`} className="text-[14.5px] font-semibold text-brand">
            {contracts.length ? "Ver contratos" : "Agregar contrato"}
          </Link>
        }
      >
        Contratos
      </SectionTitle>
      {contracts.length === 0 ? (
        <p className="text-[14.5px] text-ink-2">Todavía no hay contratos. Cuando tengan el monto del constructor, agréguelo para ver cuánto falta pagarle.</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {contracts.map((c) => (
            <ContractCard key={c.id} projectId={projectId} c={c} />
          ))}
        </div>
      )}

      <SectionTitle>Por etapa</SectionTitle>
      <Card>
        <ul className="divide-y divide-line">
          {byStage.filter((s) => s.count > 0).map((s) => (
            <li key={s.id} className="px-4 py-4 sm:px-5">
              <div className="flex items-baseline justify-between gap-3">
                <Link href={money ? `/p/${projectId}/gastos?etapa=${s.id}` : "#"} className={cx("min-w-0 truncate text-[15.5px] font-semibold", money && "hover:underline")}>
                  {s.name}
                </Link>
                <p className="tnum shrink-0 text-[15.5px] font-semibold">{crc(s.spent)}</p>
              </div>
              <div className="mt-2.5 flex h-2.5 w-full overflow-hidden rounded-full bg-sunken" aria-hidden>
                {s.spent > 0 && (
                  <div className="grow-x flex h-full" style={{ width: `${(s.spent / maxSpent) * 100}%` }}>
                    {s.bySource.map((b) => b.contributed > 0 && <div key={b.id} className={cx("h-full", noteBg(b.color))} style={{ width: `${(b.contributed / s.spent) * 100}%` }} />)}
                    {s.fromCash > 0 && <div className="h-full bg-caja" style={{ width: `${(s.fromCash / s.spent) * 100}%` }} />}
                    {s.pending > 0 && <div className="h-full bg-line-strong" style={{ width: `${(s.pending / s.spent) * 100}%` }} />}
                  </div>
                )}
              </div>
              <p className="tnum mt-1.5 text-[13px] text-ink-3">
                {s.count} {s.count === 1 ? "gasto" : "gastos"}
                {money && s.pending > 0 && <span className="font-semibold text-warn"> · por pagar {crc(s.pending)}</span>}
                {s.budget ? <span> · presupuesto {crc(s.budget)}{s.spent > s.budget && <span className="font-semibold text-danger"> (pasado por {crc(s.spent - s.budget)})</span>}</span> : null}
              </p>
            </li>
          ))}
          {byStage.some((s) => s.count === 0) && (
            <li className="px-4 py-3.5 text-[14px] text-ink-3 sm:px-5">
              Sin gastos todavía: {byStage.filter((s) => s.count === 0).map((s) => s.name).join(", ")}.
            </li>
          )}
        </ul>
      </Card>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[13px] text-ink-2">
        {partners.map((p) => (
          <span key={p.id} className="inline-flex items-center gap-1.5"><span className={cx("size-2.5 rounded-full", noteBg(p.color))} />{firstName(p.user.name)}</span>
        ))}
        <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-caja" />Caja chica</span>
        <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-line-strong" />Por pagar</span>
      </div>

      {money && (
        <div className="mt-8 grid gap-6 lg:grid-cols-2 lg:gap-8">
          <div>
            <SectionTitle>Por pagar y vencimientos</SectionTitle>
            {upcoming.length === 0 ? (
              <p className="text-[14.5px] text-ink-2">No hay pagos con fecha de vencimiento pendientes.</p>
            ) : (
              <Card>
                <ul className="divide-y divide-line">
                  {upcoming.map((e) => {
                    const pend = e.total - e.payments.reduce((b, p) => b + p.amount, 0);
                    const overdue = e.dueDate! < today;
                    return (
                      <li key={e.id}>
                        <Link href={`/p/${projectId}/gastos/${e.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-sunken/60">
                          <span className="min-w-0">
                            <span className="block truncate font-medium">{e.description}</span>
                            <span className={cx("text-[13px] font-semibold", overdue ? "text-danger" : "text-warn")}>{overdue ? "Vencido" : "Vence"} el {dateLabel(e.dueDate!)}</span>
                          </span>
                          <span className="tnum shrink-0 font-semibold">{crc(pend)}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </Card>
            )}
          </div>
          <div>
            <SectionTitle>Respaldos</SectionTitle>
            <Card className="p-5">
              <p className="text-[14.5px] text-ink-2">Con factura electrónica</p>
              <p className="tnum mt-1 text-[28px] font-semibold leading-none tracking-[-0.02em]">{total ? Math.round((withInvoice / total) * 100) : 0} %</p>
              <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-sunken" aria-hidden>
                <div className="grow-x h-full rounded-full bg-ink/70" style={{ width: `${total ? (withInvoice / total) * 100 : 0}%` }} />
              </div>
              <p className="mt-3 text-[13.5px] text-ink-2">Las facturas electrónicas respaldan el costo de la obra ante Hacienda si después venden o alquilan. Conviene confirmarlo con un contador.</p>
              {noReceipt.length > 0 && (
                <p className="mt-3 text-[14px] font-semibold text-danger">
                  {noReceipt.length} {noReceipt.length === 1 ? "gasto no tiene" : "gastos no tienen"} ningún respaldo.
                </p>
              )}
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
