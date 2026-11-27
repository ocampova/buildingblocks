"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { PaymentSource, Prisma, ReceiptType } from "@prisma/client";
import type { ActionState } from "@/components/action-form";
import { requireMoneyMember, requirePartner } from "./auth";
import { prisma } from "./db";
import { keyToDate, parseAmount, todayKey } from "./format";
import { getPartners } from "./data";
import { checkCashLow } from "./push";

const RECEIPTS: ReceiptType[] = ["FACTURA", "TIQUETE", "NOTA", "COMPROBANTE", "NINGUNO"];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

type PaymentInput = { amount: number; source: PaymentSource; partnerId: string | null };

/** Convierte la opción de "quién pagó" en pagos. "mitad" reparte según el porcentaje de cada socio. */
async function paymentsFor(projectId: string, payer: string, total: number): Promise<PaymentInput[] | { error: string }> {
  if (payer === "pendiente") return [];
  if (payer === "caja") return [{ amount: total, source: "CAJA", partnerId: null }];
  const partners = await getPartners(projectId);
  if (payer === "mitad") {
    if (partners.length < 2) return { error: "Para dividir el pago se necesitan al menos dos socios." };
    const shareTotal = partners.reduce((s, p) => s + (p.share ?? 0), 0) || partners.length;
    const parts = partners.map((p) => ({ amount: Math.floor((total * (p.share ?? 1)) / shareTotal), source: "SOCIO" as const, partnerId: p.id }));
    parts[0].amount += total - parts.reduce((s, p) => s + p.amount, 0);
    return parts;
  }
  if (payer.startsWith("socio:")) {
    const id = payer.slice(6);
    if (!partners.some((p) => p.id === id)) return { error: "Elija quién pagó." };
    return [{ amount: total, source: "SOCIO", partnerId: id }];
  }
  return { error: "Elija quién pagó." };
}

function parseLines(raw: FormDataEntryValue | null) {
  if (typeof raw !== "string" || !raw) return [];
  try {
    const arr = JSON.parse(raw) as { description: string; quantity: number; unitPrice: number; total: number }[];
    return arr
      .filter((l) => l && typeof l.description === "string" && l.description.trim())
      .slice(0, 200)
      .map((l) => ({
        description: l.description.trim().slice(0, 300),
        quantity: Number(l.quantity) || 0,
        unitPrice: Math.round(Number(l.unitPrice) || 0),
        total: Math.round(Number(l.total) || 0),
      }));
  } catch {
    return [];
  }
}

export async function createExpense(projectId: string, _: ActionState, form: FormData): Promise<ActionState> {
  const member = await requireMoneyMember(projectId);
  const total = parseAmount(form.get("total"));
  const description = String(form.get("description") ?? "").trim();
  const supplier = String(form.get("supplier") ?? "").trim() || null;
  const stageId = String(form.get("stageId") ?? "");
  const date = String(form.get("date") ?? "") || todayKey();
  const payer = String(form.get("payer") ?? "");
  const dueDate = String(form.get("dueDate") ?? "");
  const receipt = String(form.get("receiptType") ?? "NINGUNO") as ReceiptType;
  const haciendaKey = String(form.get("haciendaKey") ?? "").trim() || null;
  const attachmentIds = String(form.get("attachmentIds") ?? "").split(",").filter(Boolean);

  if (!total || total <= 0) return { error: "Escriba el monto del gasto." };
  if (!description) return { error: "Escriba qué se compró o pagó." };
  if (!DATE_RE.test(date)) return { error: "La fecha no es válida." };
  if (dueDate && !DATE_RE.test(dueDate)) return { error: "La fecha de vencimiento no es válida." };
  const stage = await prisma.stage.findFirst({ where: { id: stageId, projectId } });
  if (!stage) return { error: "Elija la etapa." };
  if (haciendaKey && (await prisma.expense.findFirst({ where: { projectId, haciendaKey } }))) {
    return { error: "Esa factura electrónica ya está registrada." };
  }
  const payments = await paymentsFor(projectId, payer, total);
  if ("error" in payments) return payments;

  const usdCents = String(form.get("currency")) === "USD" ? Math.round((Number(form.get("originalTotal")) || 0) * 100) : null;
  const rate = Number(form.get("exchangeRate")) || null;

  const expense = await prisma.$transaction(async (tx) => {
    const e = await tx.expense.create({
      data: {
        projectId,
        stageId,
        date: keyToDate(date),
        supplier,
        description: description.slice(0, 300),
        total,
        currency: "CRC",
        originalUsdCents: usdCents,
        exchangeRate: usdCents ? rate : null,
        dueDate: payer === "pendiente" && dueDate ? keyToDate(dueDate) : null,
        receiptType: RECEIPTS.includes(receipt) ? receipt : attachmentIds.length ? "TIQUETE" : "NINGUNO",
        haciendaKey,
        createdById: member.id,
        lines: { create: parseLines(form.get("lines")) },
        payments: { create: payments.map((p) => ({ ...p, date: keyToDate(date) })) },
      },
    });
    if (attachmentIds.length) {
      await tx.attachment.updateMany({
        where: { id: { in: attachmentIds }, projectId, expenseId: null, paymentId: null, cashDepositId: null },
        data: { expenseId: e.id },
      });
    }
    return e;
  });

  await checkCashLow(projectId, payments.filter((p) => p.source === "CAJA").reduce((s, p) => s + p.amount, 0), member.userId);
  revalidatePath(`/p/${projectId}`, "layout");
  redirect(`/p/${projectId}/gastos/${expense.id}?guardado=1`);
}

export async function updateExpense(projectId: string, expenseId: string, _: ActionState, form: FormData): Promise<ActionState> {
  await requireMoneyMember(projectId);
  const e = await prisma.expense.findFirst({ where: { id: expenseId, projectId }, include: { payments: true } });
  if (!e) return { error: "Ese gasto ya no existe." };
  const total = parseAmount(form.get("total"));
  const description = String(form.get("description") ?? "").trim();
  const date = String(form.get("date") ?? "");
  const dueDate = String(form.get("dueDate") ?? "");
  const stageId = String(form.get("stageId") ?? "");
  if (!total || total <= 0) return { error: "Escriba el monto del gasto." };
  if (!description) return { error: "Escriba qué se compró o pagó." };
  if (!DATE_RE.test(date)) return { error: "La fecha no es válida." };
  const paid = e.payments.reduce((s, p) => s + p.amount, 0);
  if (total < paid) return { error: `Ya se pagaron ${paid.toLocaleString("es-CR")} colones. El monto no puede ser menor; borre primero algún pago.` };
  if (!(await prisma.stage.findFirst({ where: { id: stageId, projectId } }))) return { error: "Elija la etapa." };
  const receipt = String(form.get("receiptType") ?? e.receiptType) as ReceiptType;
  await prisma.expense.update({
    where: { id: e.id },
    data: {
      total,
      description: description.slice(0, 300),
      supplier: String(form.get("supplier") ?? "").trim() || null,
      date: keyToDate(date),
      stageId,
      dueDate: dueDate && DATE_RE.test(dueDate) ? keyToDate(dueDate) : null,
      receiptType: RECEIPTS.includes(receipt) ? receipt : e.receiptType,
      notes: String(form.get("notes") ?? "").trim() || null,
    },
  });
  revalidatePath(`/p/${projectId}`, "layout");
  return { ok: "Cambios guardados." };
}

/** Solo los socios borran gastos. */
export async function deleteExpense(projectId: string, expenseId: string) {
  await requirePartner(projectId);
  await prisma.expense.deleteMany({ where: { id: expenseId, projectId } });
  revalidatePath(`/p/${projectId}`, "layout");
  redirect(`/p/${projectId}/gastos?borrado=1`);
}

export async function addPayment(projectId: string, expenseId: string, _: ActionState, form: FormData): Promise<ActionState> {
  const member = await requireMoneyMember(projectId);
  const e = await prisma.expense.findFirst({ where: { id: expenseId, projectId }, include: { payments: true } });
  if (!e) return { error: "Ese gasto ya no existe." };
  const pending = e.total - e.payments.reduce((s, p) => s + p.amount, 0);
  const amount = parseAmount(form.get("amount"));
  const date = String(form.get("date") ?? "") || todayKey();
  if (!amount || amount <= 0) return { error: "Escriba el monto del pago." };
  if (amount > pending) return { error: "El pago es mayor que lo pendiente." };
  if (!DATE_RE.test(date)) return { error: "La fecha no es válida." };
  const payments = await paymentsFor(projectId, String(form.get("payer") ?? ""), amount);
  if ("error" in payments) return payments;
  if (payments.length === 0) return { error: "Elija quién pagó." };
  const attachmentId = String(form.get("attachmentId") ?? "");
  await prisma.$transaction(async (tx) => {
    for (const p of payments) {
      const created = await tx.payment.create({ data: { ...p, expenseId: e.id, date: keyToDate(date) } });
      if (attachmentId) {
        await tx.attachment.updateMany({ where: { id: attachmentId, projectId, expenseId: null, paymentId: null }, data: { paymentId: created.id } });
      }
    }
  });
  await checkCashLow(projectId, payments.filter((p) => p.source === "CAJA").reduce((s, p) => s + p.amount, 0), member.userId);
  revalidatePath(`/p/${projectId}`, "layout");
  return { ok: "Pago registrado." };
}

export async function deletePayment(projectId: string, paymentId: string) {
  await requirePartner(projectId);
  const p = await prisma.payment.findFirst({ where: { id: paymentId, expense: { projectId } } });
  if (p) await prisma.payment.delete({ where: { id: p.id } });
  revalidatePath(`/p/${projectId}`, "layout");
}

export async function attachToExpense(projectId: string, expenseId: string, attachmentId: string) {
  await requireMoneyMember(projectId);
  const e = await prisma.expense.findFirst({ where: { id: expenseId, projectId } });
  if (!e) return;
  const data: Prisma.AttachmentUpdateManyMutationInput & { expenseId: string } = { expenseId };
  await prisma.attachment.updateMany({ where: { id: attachmentId, projectId, expenseId: null, paymentId: null }, data });
  if (e.receiptType === "NINGUNO") await prisma.expense.update({ where: { id: e.id }, data: { receiptType: "TIQUETE" } });
  revalidatePath(`/p/${projectId}`, "layout");
}

export async function deleteAttachment(projectId: string, attachmentId: string) {
  await requirePartner(projectId);
  await prisma.attachment.deleteMany({ where: { id: attachmentId, projectId } });
  revalidatePath(`/p/${projectId}`, "layout");
}
