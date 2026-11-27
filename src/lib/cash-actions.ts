"use server";

import { revalidatePath } from "next/cache";
import type { ActionState } from "@/components/action-form";
import { requireMoneyMember, requirePartner } from "./auth";
import { prisma } from "./db";
import { keyToDate, parseAmount, todayKey } from "./format";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Recarga de la caja chica: un depósito por cada socio que pone algo. */
export async function addDeposits(projectId: string, _: ActionState, form: FormData): Promise<ActionState> {
  await requireMoneyMember(projectId);
  const date = String(form.get("date") ?? "") || todayKey();
  if (!DATE_RE.test(date)) return { error: "La fecha no es válida." };
  const partners = await prisma.member.findMany({ where: { projectId, role: "SOCIO", active: true } });
  const rows = partners
    .map((p) => ({ partnerId: p.id, amount: parseAmount(form.get(`amount:${p.id}`)) ?? 0 }))
    .filter((r) => r.amount > 0);
  if (rows.length === 0) return { error: "Escriba cuánto deposita al menos un socio." };
  const note = String(form.get("note") ?? "").trim() || null;
  await prisma.cashDeposit.createMany({ data: rows.map((r) => ({ ...r, projectId, date: keyToDate(date), note })) });
  revalidatePath(`/p/${projectId}`, "layout");
  return { ok: "Depósito registrado en la caja chica." };
}

/** Transferencia entre socios para emparejar. No es un gasto de la obra. */
export async function addSettlement(projectId: string, _: ActionState, form: FormData): Promise<ActionState> {
  await requireMoneyMember(projectId);
  const from = String(form.get("from") ?? "");
  const to = String(form.get("to") ?? "");
  const amount = parseAmount(form.get("amount"));
  const date = String(form.get("date") ?? "") || todayKey();
  if (!amount || amount <= 0) return { error: "Escriba el monto." };
  if (from === to) return { error: "Elija dos socios distintos." };
  if (!DATE_RE.test(date)) return { error: "La fecha no es válida." };
  const count = await prisma.member.count({ where: { projectId, role: "SOCIO", id: { in: [from, to] } } });
  if (count !== 2) return { error: "Elija quién pagó y quién recibió." };
  await prisma.settlement.create({ data: { projectId, fromPartnerId: from, toPartnerId: to, amount, date: keyToDate(date), note: String(form.get("note") ?? "").trim() || null } });
  revalidatePath(`/p/${projectId}`, "layout");
  return { ok: "Liquidación registrada." };
}

export async function deleteDeposit(projectId: string, id: string) {
  await requirePartner(projectId);
  await prisma.cashDeposit.deleteMany({ where: { id, projectId } });
  revalidatePath(`/p/${projectId}`, "layout");
}

export async function deleteSettlement(projectId: string, id: string) {
  await requirePartner(projectId);
  await prisma.settlement.deleteMany({ where: { id, projectId } });
  revalidatePath(`/p/${projectId}`, "layout");
}
