import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";
import { NettingCard } from "@/components/contribution";
import { ExpenseRow } from "@/components/expense-row";
import { OrderRow } from "@/components/order-bits";
import { PushPrompt } from "@/components/push-prompt";
import { vapidPublicKey } from "@/lib/push";
import { ButtonLink, Card, cx, EmptyState, PayerChip, SectionTitle } from "@/components/ui";
import { requireMember, seesPartnerAccounts } from "@/lib/auth";
import { expenseListInclude, getDebtSummary } from "@/lib/data";
import { prisma } from "@/lib/db";
import { crc, dateLabel, keyToDate, todayKey } from "@/lib/format";

export default async function Home({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const member = await requireMember(projectId);

  if (!seesPartnerAccounts(member.role)) return <BuilderHome projectId={projectId} name={member.user.name} />;


  const [{ ledger, partners, debts }, recent, stats, due, byStage, stageNames] = await Promise.all([
    getDebtSummary(projectId),
    prisma.expense.findMany({ where: { projectId }, include: expenseListInclude, orderBy: [{ date: "desc" }, { createdAt: "desc" }], take: 8 }),
    prisma.expense.aggregate({ where: { projectId }, _sum: { total: true }, _count: true }),
    prisma.expense.findMany({
      where: { projectId, dueDate: { not: null, lte: new Date(keyToDate(todayKey()).getTime() + 14 * 86400000) } },
      include: { payments: { select: { amount: true } } },
      orderBy: { dueDate: "asc" },
    }),
    prisma.expense.groupBy({ by: ["stageId"], where: { projectId }, _sum: { total: true } }),
    prisma.stage.findMany({ where: { projectId }, select: { id: true, name: true } }),
  ]);
  const openOrders = await prisma.order.findMany({
    where: { projectId, status: { in: ["POR_COTIZAR", "COTIZADO"] } },
    include: { stage: { select: { name: true } }, _count: { select: { lines: true, quotes: true } } },
    orderBy: { neededBy: "asc" },
    take: 4,
  });
  const stageTotals = byStage
    .map((g) => ({ id: g.stageId, name: stageNames.find((s) => s.id === g.stageId)?.name ?? "", total: g._sum.total ?? 0 }))
    .filter((s) => s.total > 0)
    .sort((a, b) => b.total - a.total);
  const dueSoon = due.filter((e) => e.payments.reduce((s, p) => s + p.amount, 0) < e.total);
  const partnerRows = partners.map((p) => {
    const l = ledger.partners.find((x) => x.partnerId === p.id)!;
    return { id: p.id, name: p.user.name, color: p.color, contributed: l.contributed, share: p.share ?? 0, balance: l.balance };
  });
  const cashLow = ledger.cash.balance < member.project.cashMinimum;
  const today = todayKey();

  const dueBlock = dueSoon.length > 0 && (
    <section aria-label="Pagos por vencer">
      <SectionTitle>Por vencer</SectionTitle>
      <Card className="divide-y divide-line">
        {dueSoon.slice(0, 3).map((e) => {
          const overdue = e.dueDate! < keyToDate(today);
          return (
            <Link key={e.id} href={`/p/${projectId}/gastos/${e.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-sunken/60">
              <span className="min-w-0">
                <span className="block truncate text-[15px] font-medium">{e.description}</span>
                <span className={cx("block text-[13px] font-semibold", overdue ? "text-danger" : "text-warn")}>
                  {overdue ? "Vencido" : "Vence"} el {dateLabel(e.dueDate!)}
                </span>
              </span>
              <span className="tnum shrink-0 font-semibold">{crc(e.total - e.payments.reduce((s, p) => s + p.amount, 0))}</span>
            </Link>
          );
        })}
      </Card>
    </section>
  );

  const cashCard = (
    <Link
      href={`/p/${projectId}/cuentas#caja`}
      className={cx(
        "flex items-center gap-4 rounded-card border p-4 transition-colors lg:p-5",
        cashLow ? "border-warn/30 bg-warn-soft hover:border-warn/50" : "border-caja/20 bg-caja-soft hover:border-caja/40",
      )}
    >
      <PayerChip name="Caja" color="caja" size="lg" />
      <span className="min-w-0 flex-1">
        <span className={cx("block text-[14px] font-semibold", cashLow ? "text-warn" : "text-caja")}>Caja chica</span>
        <span className="block text-[13px] text-ink-2">{cashLow ? `Bajó del mínimo de ${crc(member.project.cashMinimum)}` : `Mínimo ${crc(member.project.cashMinimum)}`}</span>
      </span>
      <span className="font-figure text-[24px] font-semibold leading-none">{crc(ledger.cash.balance)}</span>
    </Link>
  );

  const stageBlock = (
    <>
        {stageTotals.length > 0 && (
          <section aria-label="Gastado por etapa">
            <SectionTitle
              action={
                <Link href={`/p/${projectId}/resumen`} className="text-[14px] font-semibold text-brand">
                  Resumen
                </Link>
              }
            >
              Por etapa
            </SectionTitle>
            <Card className="p-5">
              <p className="text-[14.5px] text-ink-2">
                Llevan <span className="font-figure font-semibold text-ink">{crc(stats._sum.total ?? 0)}</span> en {stats._count} {stats._count === 1 ? "gasto" : "gastos"}.
              </p>
              <ul className="mt-4 space-y-3">
                {stageTotals.slice(0, 5).map((s) => (
                  <li key={s.id}>
                    <div className="flex items-baseline justify-between gap-3 text-[14px]">
                      <span className="truncate font-medium">{s.name}</span>
                      <span className="tnum shrink-0 font-semibold">{crc(s.total)}</span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-sunken" aria-hidden>
                      <div className="grow-x h-full rounded-full bg-ink/70" style={{ width: `${(s.total / stageTotals[0].total) * 100}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          </section>
        )}
    </>
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-8">
      <div className="min-w-0 space-y-6">
        <h1 className="sr-only">Inicio</h1>
        <NettingCard projectId={projectId} partners={partnerRows} debts={debts} viewerMemberId={member.id} />
        <PushPrompt vapidKey={await vapidPublicKey()} />
        <div className="lg:hidden">{cashCard}</div>
        {openOrders.length > 0 && (
          <section aria-label="Pedidos por atender">
            <SectionTitle
              action={
                <Link href={`/p/${projectId}/pedidos`} className="inline-flex min-h-10 items-center gap-1 text-[14.5px] font-semibold text-brand">
                  Ver pedidos <ArrowRight className="size-4" aria-hidden />
                </Link>
              }
            >
              Pedidos por atender
            </SectionTitle>
            <Card>
              <ul className="divide-y divide-line">
                {openOrders.map((o) => (
                  <OrderRow key={o.id} projectId={projectId} o={o} />
                ))}
              </ul>
            </Card>
          </section>
        )}

        <div>
          <SectionTitle
            action={
              recent.length > 0 && (
                <Link href={`/p/${projectId}/gastos`} className="inline-flex min-h-10 items-center gap-1 text-[14.5px] font-semibold text-brand">
                  Ver todos <ArrowRight className="size-4" aria-hidden />
                </Link>
              )
            }
          >
            Últimos gastos
          </SectionTitle>
          {recent.length === 0 ? (
            <EmptyState
              title="Todavía no hay gastos"
              action={
                <ButtonLink href={`/p/${projectId}/gastos/nuevo`}>
                  <Plus className="size-5" aria-hidden /> Registrar el primero
                </ButtonLink>
              }
            >
              Tome una foto del recibo, ponga el monto y quién pagó. Lo que ya pagaron (terreno, arquitecto) también va aquí, con su fecha.
            </EmptyState>
          ) : (
            <Card>
              <ul className="divide-y divide-line">
                {recent.map((e) => (
                  <ExpenseRow key={e.id} projectId={projectId} e={e} />
                ))}
              </ul>
            </Card>
          )}
        </div>
        <div className="lg:hidden">{dueBlock}</div>
        <div className="lg:hidden">{stageBlock}</div>
      </div>

      <aside className="hidden space-y-6 lg:block">
        {cashCard}
        {dueBlock}
        {stageBlock}
      </aside>
    </div>
  );
}

async function BuilderHome({ projectId, name }: { projectId: string; name: string }) {
  const orders = await prisma.order.findMany({
    where: { projectId, status: { not: "CANCELADO" } },
    include: { stage: { select: { name: true } }, _count: { select: { lines: true, quotes: true } } },
    orderBy: [{ number: "desc" }],
    take: 12,
  });
  const open = orders.filter((o) => o.status === "POR_COTIZAR" || o.status === "COTIZADO").sort((a, b) => a.neededBy.getTime() - b.neededBy.getTime());
  const bought = orders.filter((o) => o.status === "COMPRADO");
  return (
    <div className="space-y-6">
      <h1 className="text-[26px] font-semibold tracking-[-0.02em]">Hola, {name.split(" ")[0]}</h1>
      <PushPrompt vapidKey={await vapidPublicKey()} />
      <Link
        href={`/p/${projectId}/pedidos/nuevo`}
        className="flex min-h-[88px] items-center gap-4 rounded-card border border-brand/20 bg-brand-soft/70 px-5 transition-colors hover:bg-brand-soft"
      >
        <span className="grid size-12 shrink-0 place-items-center rounded-full bg-brand text-white">
          <Plus className="size-6" aria-hidden />
        </span>
        <span>
          <span className="block text-[17px] font-semibold text-brand-strong">Pedir materiales</span>
          <span className="block text-[14px] text-ink-2">Escriba la lista o tómele una foto, y diga para cuándo.</span>
        </span>
      </Link>
      {bought.length > 0 && (
        <section>
          <SectionTitle>Comprados, por llegar</SectionTitle>
          <Card>
            <ul className="divide-y divide-line">
              {bought.map((o) => (
                <OrderRow key={o.id} projectId={projectId} o={o} />
              ))}
            </ul>
          </Card>
        </section>
      )}
      <section>
        <SectionTitle>Pedidos en trámite</SectionTitle>
        {open.length === 0 ? (
          <p className="text-[14.5px] text-ink-2">No hay pedidos pendientes.</p>
        ) : (
          <Card>
            <ul className="divide-y divide-line">
              {open.map((o) => (
                <OrderRow key={o.id} projectId={projectId} o={o} />
              ))}
            </ul>
          </Card>
        )}
      </section>
    </div>
  );
}
