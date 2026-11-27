import type { Metadata } from "next";
import { Trash2 } from "lucide-react";
import { ActionForm } from "@/components/action-form";
import { NettingCard } from "@/components/contribution";
import { TopUpForm } from "@/components/topup-form";
import { Card, cx, EmptyState, Field, Input, Notice, PageHeader, PayerChip, SectionTitle, Select } from "@/components/ui";
import { isPartner, requireMoneyMember } from "@/lib/auth";
import { addDeposits, addSettlement, deleteDeposit, deleteSettlement } from "@/lib/cash-actions";
import { getDebtSummary } from "@/lib/data";
import { prisma } from "@/lib/db";
import { crc, dateLabel, firstName, grouped, todayKey } from "@/lib/format";

export const metadata: Metadata = { title: "Cuentas" };

export default async function Accounts({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const member = await requireMoneyMember(projectId);
  const [{ ledger, partners, debts }, deposits, settlements] = await Promise.all([
    getDebtSummary(projectId),
    prisma.cashDeposit.findMany({ where: { projectId }, include: { partner: { include: { user: { select: { name: true } } } } }, orderBy: [{ date: "desc" }, { createdAt: "desc" }], take: 30 }),
    prisma.settlement.findMany({
      where: { projectId },
      include: { fromPartner: { include: { user: { select: { name: true } } } }, toPartner: { include: { user: { select: { name: true } } } } },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: 30,
    }),
  ]);
  const today = todayKey();
  const canDelete = isPartner(member.role);
  const rows = partners.map((p) => {
    const l = ledger.partners.find((x) => x.partnerId === p.id)!;
    return { ...l, id: p.id, name: p.user.name, color: p.color, share: p.share ?? 0 };
  });
  const cashLow = ledger.cash.balance < member.project.cashMinimum;
  const main = debts[0];

  if (partners.length === 0) {
    return (
      <div>
        <PageHeader title="Cuentas" />
        <EmptyState title="No hay socios">Agregue a los socios en Ajustes para llevar las cuentas.</EmptyState>
      </div>
    );
  }

  const movements = [
    ...deposits.map((d) => ({ kind: "deposit" as const, id: d.id, date: d.date, createdAt: d.createdAt, amount: d.amount, partner: d.partner, note: d.note })),
    ...settlements.map((s) => ({ kind: "settlement" as const, id: s.id, date: s.date, createdAt: s.createdAt, amount: s.amount, from: s.fromPartner, to: s.toPartner, note: s.note })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime() || b.createdAt.getTime() - a.createdAt.getTime());

  return (
    <div>
      <PageHeader title="Cuentas" description="Lo que ha puesto cada socio, la caja chica y cómo quedar parejos." />

      <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
        <div className="min-w-0 space-y-6">
          <NettingCard projectId={projectId} partners={rows} debts={debts} viewerMemberId={member.id} compact />

          <Card>
            <table className="w-full text-[14.5px]">
              <caption className="sr-only">Lo que ha puesto cada socio</caption>
              <thead>
                <tr className="border-b border-line text-left text-[13px] text-ink-3">
                  <th scope="col" className="px-4 py-2.5 font-semibold">Concepto</th>
                  {rows.map((r) => (
                    <th key={r.id} scope="col" className="px-4 py-2.5 text-right font-semibold">
                      <span className="inline-flex items-center gap-1.5">
                        <PayerChip name={r.name} color={r.color} size="sm" />
                        {firstName(r.name)}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                <Row label="Pagos directos" values={rows.map((r) => r.direct)} />
                <Row label="Depósitos a la caja" values={rows.map((r) => r.deposited)} />
                <Row label="Liquidaciones" values={rows.map((r) => r.settled)} signed />
                <Row label="Total puesto" values={rows.map((r) => r.contributed)} strong />
                <Row label="Le toca" hint="Según su porcentaje" values={rows.map((r) => r.owed)} />
                <tr>
                  <th scope="row" className="px-4 py-3 text-left font-semibold">Diferencia</th>
                  {rows.map((r) => (
                    <td key={r.id} className={cx("tnum px-4 py-3 text-right font-semibold", r.balance > 0 ? "text-ok" : r.balance < 0 ? "text-danger" : "text-ink-2")}>
                      {r.balance > 0 ? "+" : ""}
                      {crc(r.balance)}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </Card>
          <p className="text-[13.5px] text-ink-3">Solo cuenta lo pagado. Los gastos por pagar no mueven el saldo hasta que alguien los paga. Los pagos desde la caja chica ya se contaron cuando cada uno depositó.</p>
        </div>

        <div className="min-w-0 space-y-6">
          <section id="caja" className="scroll-mt-20">
            <Card className={cx("p-5", cashLow ? "border-warn/30" : "border-caja/25")}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className={cx("text-[15px] font-semibold", cashLow ? "text-warn" : "text-caja")}>Caja chica</h2>
                  <p className="tnum mt-1 text-[34px] font-semibold leading-none tracking-[-0.02em]">{crc(ledger.cash.balance)}</p>
                </div>
                <PayerChip name="Caja" color="caja" size="lg" />
              </div>
              <p className="tnum mt-3 text-[13.5px] text-ink-2">
                Depositado {crc(ledger.cash.deposited)} · gastado {crc(ledger.cash.spent)}
              </p>
              {cashLow && (
                <div className="mt-4">
                  <Notice tone="warn">Bajó del mínimo de {crc(member.project.cashMinimum)}. Toca recargar.</Notice>
                </div>
              )}
              <div className="mt-5 border-t border-line pt-5">
                <h3 className="mb-4 text-[16px] font-semibold">Recargar la caja</h3>
                <TopUpForm partners={rows.map((r) => ({ id: r.id, name: r.name, color: r.color }))} ledger={ledger} today={today} action={addDeposits.bind(null, projectId)} />
              </div>
            </Card>
          </section>

          {rows.length >= 2 && (
            <section id="emparejar" className="scroll-mt-20">
              <Card className="p-5">
                <h2 className="text-[16px] font-semibold">Emparejar con una transferencia</h2>
                <p className="mb-4 mt-1 text-[14px] text-ink-2">
                  {main ? `Si ${firstName(main.from.name)} le transfiere ${crc(main.amount)} a ${firstName(main.to.name)}, quedan parejos.` : "Ahora están parejos. Registre aquí cualquier transferencia entre socios."}
                </p>
                <ActionForm action={addSettlement.bind(null, projectId)} submitLabel="Registrar transferencia">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Transfiere" htmlFor="from">
                      <Select id="from" name="from" defaultValue={main?.fromPartnerId ?? rows[1].id}>
                        {rows.map((r) => (
                          <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="Recibe" htmlFor="to">
                      <Select id="to" name="to" defaultValue={main?.toPartnerId ?? rows[0].id}>
                        {rows.map((r) => (
                          <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="Monto" htmlFor="samount">
                      <Input id="samount" name="amount" inputMode="numeric" defaultValue={main ? grouped(main.amount) : ""} required />
                    </Field>
                    <Field label="Fecha" htmlFor="sdate">
                      <Input id="sdate" name="date" type="date" defaultValue={today} max={today} />
                    </Field>
                  </div>
                </ActionForm>
                <p className="mt-3 text-[13px] text-ink-3">Otra forma de emparejar: que el que va atrás ponga más en la próxima recarga de la caja.</p>
              </Card>
            </section>
          )}
        </div>
      </div>

      <SectionTitle>Movimientos entre socios y caja</SectionTitle>
      {movements.length === 0 ? (
        <p className="text-[14.5px] text-ink-2">Todavía no hay depósitos ni transferencias.</p>
      ) : (
        <Card>
          <ul className="divide-y divide-line">
            {movements.map((m) => (
              <li key={`${m.kind}-${m.id}`} className="flex items-center gap-3 px-4 py-3">
                {m.kind === "deposit" ? <PayerChip name={m.partner.user.name} color={m.partner.color} /> : <PayerChip name={m.from.user.name} color={m.from.color} />}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">
                    {m.kind === "deposit" ? `${firstName(m.partner.user.name)} depositó en la caja` : `${firstName(m.from.user.name)} le transfirió a ${firstName(m.to.user.name)}`}
                  </p>
                  <p className="truncate text-[13.5px] text-ink-3">
                    {dateLabel(m.date, { day: "numeric", month: "short", year: "numeric" })}
                    {m.note ? ` · ${m.note}` : ""}
                  </p>
                </div>
                <p className="tnum font-semibold">{crc(m.amount)}</p>
                {canDelete && (
                  <form action={(m.kind === "deposit" ? deleteDeposit : deleteSettlement).bind(null, projectId, m.id)}>
                    <button aria-label="Borrar movimiento" className="grid size-9 place-items-center rounded-full text-ink-3 hover:bg-danger-soft hover:text-danger">
                      <Trash2 className="size-4" aria-hidden />
                    </button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

function Row({ label, hint, values, strong, signed }: { label: string; hint?: string; values: number[]; strong?: boolean; signed?: boolean }) {
  return (
    <tr className={strong ? "bg-sunken/50" : undefined}>
      <th scope="row" className={cx("px-4 py-2.5 text-left", strong ? "font-semibold" : "font-medium text-ink-2")}>
        {label}
        {hint && <span className="block text-[12.5px] font-normal text-ink-3">{hint}</span>}
      </th>
      {values.map((v, i) => (
        <td key={i} className={cx("tnum px-4 py-2.5 text-right", strong ? "font-semibold" : "text-ink")}>
          {signed && v > 0 ? "+" : ""}
          {crc(v)}
        </td>
      ))}
    </tr>
  );
}
