"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionState } from "@/components/action-form";
import { requireMoneyMember, requirePartner } from "./auth";
import { prisma } from "./db";
import { keyToDate, parseAmount, todayKey } from "./format";
import { paymentsFor } from "./payments";
import { checkCashLow } from "./push";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function contractFields(form: FormData) {
  const contractor = String(form.get("contractor") ?? "").trim().slice(0, 120);
  const description = String(form.get("description") ?? "").trim().slice(0, 200);
  const amount = parseAmount(form.get("amount"));
  const signedAt = String(form.get("signedAt") ?? "");
  const stageId = String(form.get("stageId") ?? "") || null;
  const notes = String(form.get("notes") ?? "").trim().slice(0, 1000) || null;
  if (!contractor) return { error: "Escriba con quién es el contrato." } as const;
  if (!description) return { error: "Escriba qué cubre el contrato." } as const;
  if (!amount || amount <= 0) return { error: "Escriba el monto contratado." } as const;
  if (signedAt && !DATE_RE.test(signedAt)) return { error: "La fecha no es válida." } as const;
  return { data: { contractor, description, amount, signedAt: signedAt ? keyToDate(signedAt) : null, stageId, notes } } as const;
}

export async function createContract(projectId: string, _: ActionState, form: FormData): Promise<ActionState> {
  await requireMoneyMember(projectId);
  const f = contractFields(form);
  if ("error" in f) return { error: f.error };
  if (f.data.stageId && !(await prisma.stage.findFirst({ where: { id: f.data.stageId, projectId } }))) return { error: "Esa etapa no existe." };
  const c = await prisma.contract.create({ data: { projectId, ...f.data } });
  revalidatePath(`/p/${projectId}`, "layout");
  redirect(`/p/${projectId}/contratos/${c.id}`);
}

export async function updateContract(projectId: string, contractId: string, _: ActionState, form: FormData): Promise<ActionState> {
  await requireMoneyMember(projectId);
  const f = contractFields(form);
  if ("error" in f) return { error: f.error };
  if (f.data.stageId && !(await prisma.stage.findFirst({ where: { id: f.data.stageId, projectId } }))) return { error: "Esa etapa no existe." };
  await prisma.contract.updateMany({ where: { id: contractId, projectId }, data: f.data });
  revalidatePath(`/p/${projectId}`, "layout");
  return { ok: "Contrato actualizado." };
}

/** Solo socios. Los abonos ya registrados se quedan como gastos, sin contrato. */
export async function deleteContract(projectId: string, contractId: string) {
  await requirePartner(projectId);
  await prisma.contract.deleteMany({ where: { id: contractId, projectId } });
  revalidatePath(`/p/${projectId}`, "layout");
  redirect(`/p/${projectId}/contratos`);
}

export async function addExtra(projectId: string, contractId: string, _: ActionState, form: FormData): Promise<ActionState> {
  await requireMoneyMember(projectId);
  const c = await prisma.contract.findFirst({ where: { id: contractId, projectId } });
  if (!c) return { error: "Ese contrato ya no existe." };
  const description = String(form.get("description") ?? "").trim().slice(0, 200);
  const amount = parseAmount(form.get("amount"));
  const date = String(form.get("date") ?? "") || todayKey();
  if (!description) return { error: "Escriba qué obra adicional es." };
  if (!amount || amount <= 0) return { error: "Escriba el monto." };
  if (!DATE_RE.test(date)) return { error: "La fecha no es válida." };
  await prisma.contractExtra.create({ data: { contractId, description, amount, date: keyToDate(date) } });
  revalidatePath(`/p/${projectId}`, "layout");
  return { ok: "Obra adicional agregada." };
}

export async function deleteExtra(projectId: string, extraId: string) {
  await requirePartner(projectId);
  await prisma.contractExtra.deleteMany({ where: { id: extraId, contract: { projectId } } });
  revalidatePath(`/p/${projectId}`, "layout");
}

/**
 * Un abono es un gasto ligado al contrato: entra en las cuentas entre socios,
 * en el resumen por etapa y en el Excel como cualquier otro gasto.
 */
export async function addAbono(projectId: string, contractId: string, _: ActionState, form: FormData): Promise<ActionState> {
  const member = await requireMoneyMember(projectId);
  const c = await prisma.contract.findFirst({ where: { id: contractId, projectId }, include: { _count: { select: { expenses: true } } } });
  if (!c) return { error: "Ese contrato ya no existe." };
  const amount = parseAmount(form.get("amount"));
  const date = String(form.get("date") ?? "") || todayKey();
  const stageId = String(form.get("stageId") ?? "") || c.stageId;
  const note = String(form.get("note") ?? "").trim().slice(0, 200);
  if (!amount || amount <= 0) return { error: "Escriba el monto del abono." };
  if (!DATE_RE.test(date)) return { error: "La fecha no es válida." };
  if (!stageId || !(await prisma.stage.findFirst({ where: { id: stageId, projectId } }))) return { error: "Elija la etapa del abono." };
  const payments = await paymentsFor(projectId, String(form.get("payer") ?? ""), amount);
  if ("error" in payments) return payments;
  if (payments.length === 0) return { error: "Elija quién pagó el abono." };
  const n = c._count.expenses + 1;
  await prisma.expense.create({
    data: {
      projectId,
      stageId,
      contractId,
      date: keyToDate(date),
      supplier: c.contractor,
      description: `Abono ${n} al contrato de ${c.contractor}${note ? `: ${note}` : ""}`.slice(0, 300),
      total: amount,
      receiptType: "COMPROBANTE",
      createdById: member.id,
      payments: { create: payments.map((p) => ({ ...p, date: keyToDate(date) })) },
    },
  });
  await checkCashLow(projectId, payments.filter((p) => p.source === "CAJA").reduce((s, p) => s + p.amount, 0), member.userId);
  revalidatePath(`/p/${projectId}`, "layout");
  return { ok: `Abono ${n} registrado. Puede adjuntar el comprobante en el gasto.` };
}

export async function updateBudgetTarget(projectId: string, _: ActionState, form: FormData): Promise<ActionState> {
  await requirePartner(projectId);
  const raw = String(form.get("budgetTarget") ?? "").trim();
  const budgetTarget = raw ? parseAmount(raw) : null;
  if (raw && (!budgetTarget || budgetTarget <= 0)) return { error: "El presupuesto meta no es válido." };
  await prisma.project.update({ where: { id: projectId }, data: { budgetTarget } });
  revalidatePath(`/p/${projectId}`, "layout");
  return { ok: budgetTarget ? "Presupuesto meta guardado." : "Presupuesto meta quitado." };
}
