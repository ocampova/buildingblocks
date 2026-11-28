import "server-only";
import { cache } from "react";
import { prisma } from "./db";
import { computeLedger, debts, type Ledger } from "./ledger";

export const NOTE_COUNT = 5;

export type Source = { kind: "partner"; id: string; name: string; color: number } | { kind: "caja" };

export const getPartners = cache(async (projectId: string) => {
  return prisma.member.findMany({
    where: { projectId, role: "SOCIO", active: true },
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: "asc" },
  });
});

export type PartnerRow = Awaited<ReturnType<typeof getPartners>>[number];

export const getLedger = cache(async (projectId: string): Promise<{ ledger: Ledger; partners: PartnerRow[] }> => {
  const [partners, payments, deposits, settlements] = await Promise.all([
    getPartners(projectId),
    prisma.payment.findMany({ where: { expense: { projectId } }, select: { amount: true, source: true, partnerId: true } }),
    prisma.cashDeposit.findMany({ where: { projectId }, select: { amount: true, partnerId: true } }),
    prisma.settlement.findMany({ where: { projectId }, select: { amount: true, fromPartnerId: true, toPartnerId: true } }),
  ]);
  const ledger = computeLedger({
    partners: partners.map((p) => ({ id: p.id, share: p.share ?? 0 })),
    directPayments: payments.filter((p) => p.source === "SOCIO" && p.partnerId).map((p) => ({ partnerId: p.partnerId!, amount: p.amount })),
    deposits,
    cashPayments: payments.filter((p) => p.source === "CAJA").map((p) => ({ amount: p.amount })),
    transfers: settlements,
  });
  return { ledger, partners };
});

export async function getDebtSummary(projectId: string) {
  const { ledger, partners } = await getLedger(projectId);
  const byId = new Map(partners.map((p) => [p.id, { id: p.id, name: p.user.name, color: p.color }]));
  return {
    ledger,
    partners,
    debts: debts(ledger).map((d) => ({ ...d, from: byId.get(d.fromPartnerId)!, to: byId.get(d.toPartnerId)! })),
  };
}

/** Pagado y pendiente de un gasto */
export function paidOf(e: { total: number; payments: { amount: number }[] }) {
  const paid = e.payments.reduce((s, p) => s + p.amount, 0);
  return { paid, pending: Math.max(0, e.total - paid) };
}

export const expenseListInclude = {
  stage: { select: { id: true, name: true } },
  payments: { select: { amount: true, source: true, partner: { select: { id: true, color: true, user: { select: { name: true } } } } } },
  _count: { select: { attachments: true } },
} as const;

/** Contratos del proyecto con sus cuentas (contratado, adicionales, abonado, saldo). */
export const getContracts = cache(async (projectId: string) => {
  const { contractSummary } = await import("./contracts");
  const contracts = await prisma.contract.findMany({
    where: { projectId },
    include: {
      stage: { select: { id: true, name: true } },
      extras: { orderBy: { date: "asc" } },
      expenses: { select: { id: true, date: true, total: true, description: true, payments: { select: { amount: true, source: true, partner: { select: { color: true, user: { select: { name: true } } } } } } }, orderBy: { date: "asc" } },
    },
    orderBy: { createdAt: "asc" },
  });
  return contracts.map((c) => ({ ...c, summary: contractSummary(c) }));
});

/** Avance contra el presupuesto meta (null si no hay meta). */
export async function getBudget(projectId: string) {
  const { budgetProgress } = await import("./contracts");
  const [project, spent, contracts] = await Promise.all([
    prisma.project.findUnique({ where: { id: projectId }, select: { budgetTarget: true } }),
    prisma.expense.aggregate({ where: { projectId }, _sum: { total: true } }),
    getContracts(projectId),
  ]);
  if (!project?.budgetTarget) return null;
  return budgetProgress(project.budgetTarget, spent._sum.total ?? 0, contracts.reduce((s, c) => s + c.summary.balance, 0));
}
