import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import type { OrderStatus, Prisma } from "@prisma/client";
import { OrderRow } from "@/components/order-bits";
import { ButtonLink, Card, cx, EmptyState, PageHeader, SectionTitle } from "@/components/ui";
import { requireMember } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const metadata: Metadata = { title: "Pedidos" };

const VIEWS = {
  abiertos: { label: "Por atender", statuses: ["POR_COTIZAR", "COTIZADO"] as OrderStatus[] },
  comprados: { label: "Comprados", statuses: ["COMPRADO"] as OrderStatus[] },
  recibidos: { label: "Recibidos", statuses: ["RECIBIDO"] as OrderStatus[] },
  todos: { label: "Todos", statuses: [] as OrderStatus[] },
};

export default async function Orders({ params, searchParams }: { params: Promise<{ projectId: string }>; searchParams: Promise<{ ver?: string }> }) {
  const { projectId } = await params;
  const { ver } = await searchParams;
  const member = await requireMember(projectId);
  const view = (ver && ver in VIEWS ? ver : "abiertos") as keyof typeof VIEWS;
  const where: Prisma.OrderWhereInput = { projectId, ...(VIEWS[view].statuses.length ? { status: { in: VIEWS[view].statuses } } : {}) };
  const [orders, counts] = await Promise.all([
    prisma.order.findMany({
      where,
      include: { stage: { select: { name: true } }, _count: { select: { lines: true, quotes: true } } },
      orderBy: view === "abiertos" ? [{ neededBy: "asc" }, { number: "asc" }] : [{ number: "desc" }],
      take: 200,
    }),
    prisma.order.groupBy({ by: ["status"], where: { projectId }, _count: true }),
  ]);
  const count = (s: OrderStatus[]) => counts.filter((c) => !s.length || s.includes(c.status)).reduce((a, c) => a + c._count, 0);
  const builder = member.role === "CONSTRUCTOR";
  const toQuote = orders.filter((o) => o.status === "POR_COTIZAR");
  const quoted = orders.filter((o) => o.status === "COTIZADO");

  return (
    <div>
      <PageHeader
        title="Pedidos de materiales"
        description={builder ? "Pida aquí lo que necesita y para cuándo." : "Lo que pide el constructor, para cotizar y comprar a tiempo."}
        action={
          <div className="hidden lg:block">
            <ButtonLink href={`/p/${projectId}/pedidos/nuevo`}>
              <Plus className="size-5" aria-hidden /> Nuevo pedido
            </ButtonLink>
          </div>
        }
      />

      <nav aria-label="Ver pedidos" className="-mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-0.5 [scrollbar-width:none] lg:mx-0 lg:px-0">
        {(Object.keys(VIEWS) as (keyof typeof VIEWS)[]).map((k) => (
          <Link
            key={k}
            href={`/p/${projectId}/pedidos${k === "abiertos" ? "" : `?ver=${k}`}`}
            aria-current={view === k ? "page" : undefined}
            className={cx(
              "inline-flex min-h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 text-[14px] font-medium",
              view === k ? "border-ink bg-ink text-white" : "border-line-strong bg-surface text-ink-2 hover:border-ink-3",
            )}
          >
            {VIEWS[k].label}
            <span className={cx("tnum text-[12.5px]", view === k ? "text-white/75" : "text-ink-3")}>{count(VIEWS[k].statuses)}</span>
          </Link>
        ))}
      </nav>

      {orders.length === 0 ? (
        <EmptyState
          title={view === "abiertos" ? "Nada pendiente" : "No hay pedidos aquí"}
          action={
            <ButtonLink href={`/p/${projectId}/pedidos/nuevo`}>
              <Plus className="size-5" aria-hidden /> Nuevo pedido
            </ButtonLink>
          }
        >
          {view === "abiertos" ? "Cuando el constructor pida materiales, aparecen aquí ordenados por la fecha en que los necesita." : undefined}
        </EmptyState>
      ) : view === "abiertos" ? (
        <div className="space-y-2">
          {toQuote.length > 0 && (
            <section>
              <SectionTitle>Por cotizar</SectionTitle>
              <Card>
                <ul className="divide-y divide-line">
                  {toQuote.map((o) => (
                    <OrderRow key={o.id} projectId={projectId} o={o} />
                  ))}
                </ul>
              </Card>
            </section>
          )}
          {quoted.length > 0 && (
            <section>
              <SectionTitle>Cotizados, falta comprar</SectionTitle>
              <Card>
                <ul className="divide-y divide-line">
                  {quoted.map((o) => (
                    <OrderRow key={o.id} projectId={projectId} o={o} />
                  ))}
                </ul>
              </Card>
            </section>
          )}
        </div>
      ) : (
        <Card>
          <ul className="divide-y divide-line">
            {orders.map((o) => (
              <OrderRow key={o.id} projectId={projectId} o={o} />
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
