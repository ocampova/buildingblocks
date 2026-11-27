import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { ExpenseRow } from "@/components/expense-row";
import { ButtonLink, Card, cx, EmptyState, Notice, PageHeader } from "@/components/ui";
import { requireMoneyMember } from "@/lib/auth";
import { expenseListInclude, getPartners } from "@/lib/data";
import { prisma } from "@/lib/db";
import { capitalize, crc, dateLabel, dateKey } from "@/lib/format";

export const metadata: Metadata = { title: "Gastos" };

type Search = { etapa?: string; quien?: string; estado?: string; borrado?: string };

export default async function Expenses({ params, searchParams }: { params: Promise<{ projectId: string }>; searchParams: Promise<Search> }) {
  const { projectId } = await params;
  const sp = await searchParams;
  await requireMoneyMember(projectId);
  const [stages, partners] = await Promise.all([prisma.stage.findMany({ where: { projectId }, orderBy: { position: "asc" } }), getPartners(projectId)]);

  const where: Prisma.ExpenseWhereInput = { projectId };
  if (sp.etapa) where.stageId = sp.etapa;
  if (sp.quien === "caja") where.payments = { some: { source: "CAJA" } };
  else if (sp.quien) where.payments = { some: { partnerId: sp.quien } };
  const expenses = await prisma.expense.findMany({ where, include: expenseListInclude, orderBy: [{ date: "desc" }, { createdAt: "desc" }], take: 500 });
  const list = sp.estado === "pendiente" ? expenses.filter((e) => e.payments.reduce((s, p) => s + p.amount, 0) < e.total) : expenses;
  const total = list.reduce((s, e) => s + e.total, 0);

  // Agrupa por mes
  const months = new Map<string, typeof list>();
  for (const e of list) {
    const k = dateKey(e.date).slice(0, 7);
    months.set(k, [...(months.get(k) ?? []), e]);
  }

  const q = (patch: Partial<Search>) => {
    const next = { etapa: sp.etapa, quien: sp.quien, estado: sp.estado, ...patch };
    const s = new URLSearchParams(Object.entries(next).filter(([, v]) => v) as [string, string][]).toString();
    return `/p/${projectId}/gastos${s ? `?${s}` : ""}`;
  };
  const filtered = Boolean(sp.etapa || sp.quien || sp.estado);

  return (
    <div>
      <PageHeader
        title="Gastos"
        description={
          <span className="tnum">
            {list.length} {list.length === 1 ? "gasto" : "gastos"} · {crc(total)}
          </span>
        }
        action={
          <div className="hidden lg:block">
            <ButtonLink href={`/p/${projectId}/gastos/nuevo`}>
              <Plus className="size-5" aria-hidden /> Registrar gasto
            </ButtonLink>
          </div>
        }
      />
      {sp.borrado && (
        <div className="mb-4">
          <Notice tone="ok">El gasto se borró.</Notice>
        </div>
      )}

      <div className="-mx-4 mb-5 space-y-2.5 overflow-hidden px-4 lg:mx-0 lg:px-0">
        <FilterRow label="Etapa">
          <Chip href={q({ etapa: undefined })} active={!sp.etapa}>Todas</Chip>
          {stages.map((s) => (
            <Chip key={s.id} href={q({ etapa: s.id })} active={sp.etapa === s.id}>
              {s.name}
            </Chip>
          ))}
        </FilterRow>
        <FilterRow label="Pagó">
          <Chip href={q({ quien: undefined, estado: undefined })} active={!sp.quien && !sp.estado}>Todos</Chip>
          {partners.map((p) => (
            <Chip key={p.id} href={q({ quien: p.id, estado: undefined })} active={sp.quien === p.id}>
              {p.user.name.split(" ")[0]}
            </Chip>
          ))}
          <Chip href={q({ quien: "caja", estado: undefined })} active={sp.quien === "caja"}>Caja chica</Chip>
          <Chip href={q({ quien: undefined, estado: "pendiente" })} active={sp.estado === "pendiente"}>Por pagar</Chip>
        </FilterRow>
      </div>

      {list.length === 0 ? (
        filtered ? (
          <EmptyState title="Ningún gasto con ese filtro" action={<ButtonLink href={`/p/${projectId}/gastos`} variant="secondary">Quitar filtros</ButtonLink>} />
        ) : (
          <EmptyState title="Todavía no hay gastos" action={<ButtonLink href={`/p/${projectId}/gastos/nuevo`}>Registrar el primero</ButtonLink>}>
            Cada compra, pago al constructor, la CCSS o los permisos van aquí.
          </EmptyState>
        )
      ) : (
        <div className="space-y-6">
          {[...months.entries()].map(([month, items]) => (
            <section key={month}>
              <div className="mb-2 flex items-baseline justify-between px-1">
                <h2 className="text-[15px] font-semibold text-ink-2">{capitalize(dateLabel(new Date(`${month}-01T00:00:00Z`), { month: "long", year: "numeric" }))}</h2>
                <p className="tnum text-[14px] font-semibold text-ink-2">{crc(items.reduce((s, e) => s + e.total, 0))}</p>
              </div>
              <Card>
                <ul className="divide-y divide-line">
                  {items.map((e) => (
                    <ExpenseRow key={e.id} projectId={projectId} e={e} />
                  ))}
                </ul>
              </Card>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none]" role="group" aria-label={label}>
      <span className="w-12 shrink-0 text-[13px] font-semibold text-ink-3">{label}</span>
      {children}
    </div>
  );
}

function Chip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={cx(
        "inline-flex min-h-10 shrink-0 items-center whitespace-nowrap rounded-full border px-3.5 text-[14px] font-medium transition-colors",
        active ? "border-ink bg-ink text-white" : "border-line-strong bg-surface text-ink-2 hover:border-ink-3",
      )}
    >
      {children}
    </Link>
  );
}
