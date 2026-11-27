"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { QualityMatch } from "@prisma/client";
import type { ActionState } from "@/components/action-form";
import { requireMember, requireMoneyMember } from "./auth";
import { getPartners } from "./data";
import { prisma } from "./db";
import { keyToDate, todayKey } from "./format";
import { checkCashLow, notifyProject } from "./push";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const LineSchema = z.object({
  material: z.string().trim().min(1).max(200),
  quantity: z.number().positive(),
  unit: z.string().trim().min(1).max(30),
  quality: z.string().trim().max(200).nullable().optional(),
});

function parseJson<T>(raw: FormDataEntryValue | null, schema: z.ZodType<T>): T | null {
  if (typeof raw !== "string") return null;
  try {
    const p = schema.safeParse(JSON.parse(raw));
    return p.success ? p.data : null;
  } catch {
    return null;
  }
}

/** Cualquier miembro puede pedir materiales; normalmente lo hace el constructor. */
export async function createOrder(projectId: string, _: ActionState, form: FormData): Promise<ActionState> {
  const member = await requireMember(projectId);
  const title = String(form.get("title") ?? "").trim();
  const neededBy = String(form.get("neededBy") ?? "");
  const stageId = String(form.get("stageId") ?? "") || null;
  const lines = parseJson(form.get("lines"), z.array(LineSchema).min(1).max(150));
  if (!title) return { error: "Escriba para qué es el pedido." };
  if (!DATE_RE.test(neededBy)) return { error: "Elija la fecha en que necesita los materiales." };
  if (!lines) return { error: "Agregue al menos un material con su cantidad y unidad." };
  if (stageId && !(await prisma.stage.findFirst({ where: { id: stageId, projectId } }))) return { error: "Esa etapa no existe." };
  const attachmentIds = String(form.get("attachmentIds") ?? "").split(",").filter(Boolean);

  const order = await prisma.$transaction(async (tx) => {
    const p = await tx.project.update({ where: { id: projectId }, data: { nextOrderNumber: { increment: 1 } } });
    const o = await tx.order.create({
      data: {
        projectId,
        number: p.nextOrderNumber - 1,
        title: title.slice(0, 160),
        stageId,
        neededBy: keyToDate(neededBy),
        notes: String(form.get("notes") ?? "").trim() || null,
        createdById: member.id,
        lines: { create: lines.map((l, i) => ({ position: i, material: l.material, quantity: l.quantity, unit: l.unit, quality: l.quality || null })) },
      },
    });
    if (attachmentIds.length) {
      await tx.attachment.updateMany({ where: { id: { in: attachmentIds }, projectId, orderId: null, expenseId: null, quoteId: null }, data: { orderId: o.id } });
    }
    return o;
  });

  await notifyProject(projectId, ["SOCIO", "ADMINISTRACION"], { title: `Pedido ${order.number}: ${order.title}`, body: `${lines.length} ${lines.length === 1 ? "material" : "materiales"} para el ${neededBy.split("-").reverse().join("/")}.`, url: `/p/${projectId}/pedidos/${order.id}`, tag: `order-${order.id}` }, member.userId);
  revalidatePath(`/p/${projectId}`, "layout");
  redirect(`/p/${projectId}/pedidos/${order.id}?creado=1`);
}

const QuoteSchema = z.object({
  supplier: z.string().trim().min(1).max(120),
  date: z.string().regex(DATE_RE),
  deliveryDays: z.number().int().min(0).max(365).nullable(),
  transport: z.number().int().min(0).nullable(),
  credit: z.string().trim().max(120).nullable(),
  notes: z.string().trim().max(500).nullable(),
  readByAi: z.boolean(),
  attachmentId: z.string().nullable(),
  lines: z.array(
    z.object({
      orderLineId: z.string(),
      unitPrice: z.number().int().min(0).nullable(),
      brand: z.string().trim().max(120).nullable(),
      quality: z.enum(["CUMPLE", "DISTINTA", "NO_CLARO"]),
      qualityNote: z.string().trim().max(300).nullable(),
    }),
  ),
});

export async function saveQuote(projectId: string, orderId: string, quoteId: string | null, raw: unknown): Promise<ActionState> {
  await requireMoneyMember(projectId);
  const p = QuoteSchema.safeParse(raw);
  if (!p.success) return { error: "Revise los datos de la cotización." };
  const q = p.data;
  const order = await prisma.order.findFirst({ where: { id: orderId, projectId }, include: { lines: true } });
  if (!order) return { error: "Ese pedido ya no existe." };
  if (order.status === "COMPRADO" || order.status === "RECIBIDO") return { error: "Este pedido ya se compró." };
  const priced = q.lines.filter((l) => l.unitPrice && order.lines.some((ol) => ol.id === l.orderLineId));
  if (priced.length === 0) return { error: "Ponga el precio de al menos un material." };

  const supplier = await prisma.supplier.upsert({
    where: { projectId_name: { projectId, name: q.supplier } },
    create: { projectId, name: q.supplier },
    update: {},
  });
  const data = {
    supplierId: supplier.id,
    date: keyToDate(q.date),
    deliveryDays: q.deliveryDays,
    transport: q.transport,
    credit: q.credit || null,
    notes: q.notes || null,
    readByAi: q.readByAi,
  };
  const lineData = priced.map((l) => {
    const ol = order.lines.find((x) => x.id === l.orderLineId)!;
    return {
      orderLineId: ol.id,
      description: ol.material,
      brand: l.brand || null,
      quantity: ol.quantity,
      unit: ol.unit,
      unitPrice: l.unitPrice!,
      total: Math.round(l.unitPrice! * ol.quantity),
      quality: l.quality as QualityMatch,
      qualityNote: l.quality === "CUMPLE" ? null : l.qualityNote || null,
    };
  });

  await prisma.$transaction(async (tx) => {
    let id = quoteId;
    if (id) {
      const existing = await tx.quote.findFirst({ where: { id, orderId } });
      if (!existing) throw new Error("Cotización no encontrada");
      // Al reemplazar las líneas se pierde la elección hecha con ellas
      await tx.orderLine.updateMany({ where: { orderId, chosen: { quoteId: id } }, data: { chosenId: null } });
      await tx.quoteLine.deleteMany({ where: { quoteId: id } });
      await tx.quote.update({ where: { id }, data: { ...data, lines: { create: lineData } } });
    } else {
      id = (await tx.quote.create({ data: { ...data, orderId, lines: { create: lineData } } })).id;
    }
    if (q.attachmentId) {
      await tx.attachment.updateMany({ where: { id: q.attachmentId, projectId, quoteId: null, orderId: null, expenseId: null }, data: { quoteId: id } });
    }
    if (order.status === "POR_COTIZAR") await tx.order.update({ where: { id: orderId }, data: { status: "COTIZADO" } });
  });
  revalidatePath(`/p/${projectId}`, "layout");
  return { ok: quoteId ? "Cotización actualizada." : `Cotización de ${q.supplier} guardada.` };
}

export async function deleteQuote(projectId: string, orderId: string, quoteId: string) {
  await requireMoneyMember(projectId);
  const order = await prisma.order.findFirst({ where: { id: orderId, projectId } });
  if (!order || order.status === "COMPRADO" || order.status === "RECIBIDO") return;
  await prisma.quote.deleteMany({ where: { id: quoteId, orderId } });
  if ((await prisma.quote.count({ where: { orderId } })) === 0) await prisma.order.update({ where: { id: orderId }, data: { status: "POR_COTIZAR" } });
  revalidatePath(`/p/${projectId}`, "layout");
}

/** Guarda qué cotización se elige para cada material. */
export async function chooseLines(projectId: string, orderId: string, choices: Record<string, string | null>): Promise<ActionState> {
  await requireMoneyMember(projectId);
  const order = await prisma.order.findFirst({ where: { id: orderId, projectId }, include: { lines: true, quotes: { include: { lines: true } } } });
  if (!order) return { error: "Ese pedido ya no existe." };
  if (order.status === "COMPRADO" || order.status === "RECIBIDO") return { error: "Este pedido ya se compró." };
  const valid = new Map(order.quotes.flatMap((q) => q.lines.map((l) => [l.id, l.orderLineId])));
  await prisma.$transaction(
    order.lines.map((ol) => {
      const pick = choices[ol.id];
      const ok = pick && valid.get(pick) === ol.id;
      return prisma.orderLine.update({ where: { id: ol.id }, data: { chosenId: ok ? pick : null } });
    }),
  );
  revalidatePath(`/p/${projectId}/pedidos/${orderId}`);
  return { ok: "Elección guardada." };
}

/**
 * Registra la compra: un gasto por proveedor con lo elegido, más su transporte.
 * Quién pagó funciona igual que en un gasto normal.
 */
export async function buyOrder(projectId: string, orderId: string, _: ActionState, form: FormData): Promise<ActionState> {
  const member = await requireMoneyMember(projectId);
  const order = await prisma.order.findFirst({
    where: { id: orderId, projectId },
    include: { lines: { include: { chosen: { include: { quote: { include: { supplier: true } } } } }, orderBy: { position: "asc" } } },
  });
  if (!order) return { error: "Ese pedido ya no existe." };
  if (order.status === "COMPRADO" || order.status === "RECIBIDO") return { error: "Este pedido ya se compró." };
  const chosen = order.lines.filter((l) => l.chosen);
  if (chosen.length === 0) return { error: "Elija primero a quién se le compra cada material." };
  const stageId = String(form.get("stageId") ?? "") || order.stageId;
  if (!stageId || !(await prisma.stage.findFirst({ where: { id: stageId, projectId } }))) return { error: "Elija la etapa del gasto." };
  const date = String(form.get("date") ?? "") || todayKey();
  if (!DATE_RE.test(date)) return { error: "La fecha no es válida." };
  const payer = String(form.get("payer") ?? "");
  const dueDate = String(form.get("dueDate") ?? "");
  const partners = await getPartners(projectId);
  const payerOk =
    payer === "pendiente" || payer === "caja" || (payer === "mitad" && partners.length >= 2) || (payer.startsWith("socio:") && partners.some((p) => p.id === payer.slice(6)));
  if (!payerOk) return { error: "Elija quién pagó." };

  // Agrupa por cotización (proveedor)
  const groups = new Map<string, typeof chosen>();
  for (const l of chosen) groups.set(l.chosen!.quoteId, [...(groups.get(l.chosen!.quoteId) ?? []), l]);

  await prisma.$transaction(async (tx) => {
    for (const lines of groups.values()) {
      const quote = lines[0].chosen!.quote;
      const items = lines.map((l) => ({ description: `${l.material}${l.chosen!.brand ? ` (${l.chosen!.brand})` : ""}`, quantity: l.quantity, unitPrice: l.chosen!.unitPrice, total: Math.round(l.chosen!.unitPrice * l.quantity) }));
      if (quote.transport) items.push({ description: "Transporte", quantity: 1, unitPrice: quote.transport, total: quote.transport });
      const total = items.reduce((s, i) => s + i.total, 0);
      const payments =
        payer === "pendiente"
          ? []
          : payer === "caja"
            ? [{ amount: total, source: "CAJA" as const, partnerId: null }]
            : payer === "mitad" && partners.length >= 2
              ? (() => {
                  const shareTotal = partners.reduce((s, p) => s + (p.share ?? 0), 0) || partners.length;
                  const parts = partners.map((p) => ({ amount: Math.floor((total * (p.share ?? 1)) / shareTotal), source: "SOCIO" as const, partnerId: p.id }));
                  parts[0].amount += total - parts.reduce((s, p) => s + p.amount, 0);
                  return parts;
                })()
              : [{ amount: total, source: "SOCIO" as const, partnerId: payer.slice(6) }];
      await tx.expense.create({
        data: {
          projectId,
          stageId,
          orderId,
          date: keyToDate(date),
          supplier: quote.supplier.name,
          description: `Pedido ${order.number}: ${order.title}`.slice(0, 300),
          total,
          dueDate: payer === "pendiente" && DATE_RE.test(dueDate) ? keyToDate(dueDate) : null,
          receiptType: "NINGUNO",
          createdById: member.id,
          lines: { create: items },
          payments: { create: payments.map((p) => ({ ...p, date: keyToDate(date) })) },
        },
      });
    }
    await tx.order.update({ where: { id: orderId }, data: { status: "COMPRADO", boughtAt: new Date(), stageId } });
  });

  if (payer === "caja") {
    const spentCash = chosen.reduce((s, l) => s + Math.round(l.chosen!.unitPrice * l.quantity), 0) + [...groups.values()].reduce((s, l) => s + (l[0].chosen!.quote.transport ?? 0), 0);
    await checkCashLow(projectId, spentCash, member.userId);
  }
  const suppliers = [...groups.values()].map((l) => l[0].chosen!.quote.supplier.name).join(" y ");
  await notifyProject(projectId, ["CONSTRUCTOR"], { title: `Pedido ${order.number} comprado`, body: `${order.title}: se le compró a ${suppliers}.`, url: `/p/${projectId}/pedidos/${orderId}`, tag: `order-${orderId}` }, member.userId);
  revalidatePath(`/p/${projectId}`, "layout");
  redirect(`/p/${projectId}/pedidos/${orderId}?comprado=${groups.size}`);
}

export async function receiveOrder(projectId: string, orderId: string, _: ActionState, form: FormData): Promise<ActionState> {
  const member = await requireMember(projectId);
  const order = await prisma.order.findFirst({ where: { id: orderId, projectId } });
  if (!order) return { error: "Ese pedido ya no existe." };
  if (order.status !== "COMPRADO") return { error: "Solo se marca como recibido un pedido ya comprado." };
  const note = String(form.get("note") ?? "").trim() || null;
  await prisma.order.update({ where: { id: orderId }, data: { status: "RECIBIDO", receivedAt: new Date(), receivedNote: note } });
  await notifyProject(projectId, ["SOCIO", "ADMINISTRACION"], { title: `Pedido ${order.number} recibido en obra`, body: note ? `Con faltantes: ${note}` : `${order.title}: llegó completo.`, url: `/p/${projectId}/pedidos/${orderId}`, tag: `order-${orderId}` }, member.userId);
  revalidatePath(`/p/${projectId}`, "layout");
  return { ok: "Marcado como recibido." };
}

export async function cancelOrder(projectId: string, orderId: string) {
  const member = await requireMember(projectId);
  const order = await prisma.order.findFirst({ where: { id: orderId, projectId } });
  if (!order || order.status === "COMPRADO" || order.status === "RECIBIDO") return;
  // El constructor solo cancela sus propios pedidos
  if (member.role === "CONSTRUCTOR" && order.createdById !== member.id) return;
  await prisma.order.update({ where: { id: orderId }, data: { status: "CANCELADO" } });
  revalidatePath(`/p/${projectId}`, "layout");
}

export async function updateNeededBy(projectId: string, orderId: string, _: ActionState, form: FormData): Promise<ActionState> {
  await requireMember(projectId);
  const neededBy = String(form.get("neededBy") ?? "");
  if (!DATE_RE.test(neededBy)) return { error: "La fecha no es válida." };
  await prisma.order.updateMany({ where: { id: orderId, projectId }, data: { neededBy: keyToDate(neededBy) } });
  revalidatePath(`/p/${projectId}`, "layout");
  return { ok: "Fecha actualizada." };
}

