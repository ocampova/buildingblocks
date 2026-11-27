"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Role } from "@prisma/client";
import type { ActionState } from "@/components/action-form";
import { requirePartner } from "./auth";
import { prisma } from "./db";
import { NOTE_COUNT } from "./data";
import { parseAmount } from "./format";
import { issueToken, linkFor } from "./tokens";

export async function updateProject(projectId: string, _: ActionState, form: FormData): Promise<ActionState> {
  await requirePartner(projectId);
  const name = String(form.get("name") ?? "").trim();
  const cashMinimum = parseAmount(form.get("cashMinimum")) ?? 0;
  if (name.length < 2) return { error: "Escriba el nombre del proyecto." };
  await prisma.project.update({ where: { id: projectId }, data: { name, cashMinimum } });
  revalidatePath(`/p/${projectId}`, "layout");
  return { ok: "Proyecto actualizado." };
}

export async function saveStage(projectId: string, stageId: string | null, _: ActionState, form: FormData): Promise<ActionState> {
  await requirePartner(projectId);
  const name = String(form.get("name") ?? "").trim();
  const budgetRaw = String(form.get("budget") ?? "").trim();
  const budget = budgetRaw ? parseAmount(budgetRaw) : null;
  if (name.length < 2) return { error: "Escriba el nombre de la etapa." };
  if (stageId) {
    await prisma.stage.updateMany({ where: { id: stageId, projectId }, data: { name, budget } });
  } else {
    const last = await prisma.stage.findFirst({ where: { projectId }, orderBy: { position: "desc" } });
    await prisma.stage.create({ data: { projectId, name, budget, position: (last?.position ?? -1) + 1, kind: form.get("general") ? "GENERAL" : "OBRA" } });
  }
  revalidatePath(`/p/${projectId}`, "layout");
  return { ok: stageId ? "Etapa guardada." : "Etapa agregada." };
}

export async function moveStage(projectId: string, stageId: string, dir: -1 | 1) {
  await requirePartner(projectId);
  const stages = await prisma.stage.findMany({ where: { projectId }, orderBy: { position: "asc" } });
  const i = stages.findIndex((s) => s.id === stageId);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= stages.length) return;
  await prisma.$transaction([
    prisma.stage.update({ where: { id: stages[i].id }, data: { position: stages[j].position } }),
    prisma.stage.update({ where: { id: stages[j].id }, data: { position: stages[i].position } }),
  ]);
  revalidatePath(`/p/${projectId}`, "layout");
}

export async function deleteStage(projectId: string, stageId: string) {
  await requirePartner(projectId);
  const used = await prisma.expense.count({ where: { stageId, projectId } });
  if (used === 0) await prisma.stage.deleteMany({ where: { id: stageId, projectId } });
  revalidatePath(`/p/${projectId}`, "layout");
}

const InviteSchema = z.object({
  name: z.string().trim().min(2, "Escriba el nombre."),
  email: z.email("El correo no es válido.").transform((s) => s.toLowerCase()),
  role: z.enum(["SOCIO", "ADMINISTRACION", "CONSTRUCTOR"]),
});

/** Invita a una persona: crea su cuenta si no existe y devuelve el enlace para activarla. */
export async function invite(projectId: string, _: ActionState, form: FormData): Promise<ActionState> {
  await requirePartner(projectId);
  const parsed = InviteSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { name, email, role } = parsed.data;
  let user = await prisma.user.findUnique({ where: { email } });
  if (user && (await prisma.member.findFirst({ where: { projectId, userId: user.id } }))) {
    return { error: "Esa persona ya está en el proyecto. Use “Enlace nuevo” en su fila." };
  }
  if (!user) user = await prisma.user.create({ data: { name, email } });
  const partners = await prisma.member.findMany({ where: { projectId, role: "SOCIO" }, select: { color: true } });
  const used = new Set(partners.map((p) => p.color));
  const color = Array.from({ length: NOTE_COUNT }, (_, i) => i).find((i) => !used.has(i)) ?? partners.length % NOTE_COUNT;
  await prisma.member.create({ data: { projectId, userId: user.id, role: role as Role, share: role === "SOCIO" ? 50 : null, color: role === "SOCIO" ? color : 0 } });
  revalidatePath(`/p/${projectId}/ajustes`);
  if (user.passwordHash) return { ok: `${name} ya tenía cuenta en Obra: puede entrar con su contraseña.` };
  const token = await issueToken(user.id, "INVITE");
  return { ok: `Listo. Envíele este enlace a ${name.split(" ")[0]} para que active su cuenta:`, fields: { link: linkFor("INVITE", token), name } };
}

export async function newInviteLink(projectId: string, memberId: string): Promise<ActionState> {
  await requirePartner(projectId);
  const m = await prisma.member.findFirst({ where: { id: memberId, projectId }, include: { user: true } });
  if (!m) return { error: "Esa persona ya no está en el proyecto." };
  const token = await issueToken(m.userId, m.user.passwordHash ? "RESET" : "INVITE");
  return { ok: m.user.passwordHash ? "Enlace para cambiar la contraseña:" : "Enlace para activar la cuenta:", fields: { link: linkFor(m.user.passwordHash ? "RESET" : "INVITE", token), name: m.user.name } };
}

export async function updateShares(projectId: string, _: ActionState, form: FormData): Promise<ActionState> {
  await requirePartner(projectId);
  const partners = await prisma.member.findMany({ where: { projectId, role: "SOCIO", active: true } });
  const shares = partners.map((p) => ({ id: p.id, share: Number(form.get(`share:${p.id}`)) }));
  if (shares.some((s) => !Number.isInteger(s.share) || s.share < 0 || s.share > 100)) return { error: "Cada porcentaje debe ser un número entero entre 0 y 100." };
  const sum = shares.reduce((a, s) => a + s.share, 0);
  if (sum !== 100) return { error: `Los porcentajes suman ${sum} %. Deben sumar 100 %.` };
  await prisma.$transaction(shares.map((s) => prisma.member.update({ where: { id: s.id }, data: { share: s.share } })));
  revalidatePath(`/p/${projectId}`, "layout");
  return { ok: "Porcentajes guardados." };
}

export async function removeMember(projectId: string, memberId: string) {
  const me = await requirePartner(projectId);
  if (me.id === memberId) return;
  const m = await prisma.member.findFirst({ where: { id: memberId, projectId } });
  if (!m) return;
  // Un socio con movimientos no se borra: se desactiva para no perder las cuentas
  const hasMoney = (await prisma.payment.count({ where: { partnerId: m.id } })) + (await prisma.cashDeposit.count({ where: { partnerId: m.id } })) > 0;
  if (hasMoney || (await prisma.expense.count({ where: { createdById: m.id } })) > 0) {
    await prisma.member.update({ where: { id: m.id }, data: { active: false } });
  } else {
    await prisma.member.delete({ where: { id: m.id } });
  }
  revalidatePath(`/p/${projectId}`, "layout");
}
