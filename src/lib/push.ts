import "server-only";
import * as webpush from "web-push";
import { after } from "next/server";
import { prisma } from "./db";

let vapid: { publicKey: string; privateKey: string } | null | undefined;

/**
 * Claves VAPID: de las variables de entorno o, si no existen, generadas una vez
 * y guardadas en la base de datos (así no hay que configurarlas al publicar).
 */
async function getVapid() {
  if (vapid !== undefined) return vapid;
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    vapid = { publicKey: process.env.VAPID_PUBLIC_KEY, privateKey: process.env.VAPID_PRIVATE_KEY };
  } else {
    try {
      const stored = await prisma.appSetting.findUnique({ where: { key: "vapid" } });
      if (stored) vapid = JSON.parse(stored.value);
      else {
        const keys = webpush.generateVAPIDKeys();
        await prisma.appSetting.create({ data: { key: "vapid", value: JSON.stringify(keys) } }).catch(() => {});
        const saved = await prisma.appSetting.findUnique({ where: { key: "vapid" } });
        vapid = saved ? JSON.parse(saved.value) : keys;
      }
    } catch {
      vapid = null;
    }
  }
  if (vapid) webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? "mailto:avisos@obra.app", vapid.publicKey, vapid.privateKey);
  return vapid;
}

export const vapidPublicKey = async () => (await getVapid())?.publicKey ?? null;

export type PushPayload = { title: string; body: string; url: string; tag?: string };

/** Envía una notificación a los dispositivos de estos usuarios. Nunca lanza errores. */
export async function notify(userIds: string[], payload: PushPayload) {
  if (userIds.length === 0 || !(await getVapid())) return;
  const subs = await prisma.pushSubscription.findMany({ where: { userId: { in: [...new Set(userIds)] } } });
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(payload), { TTL: 60 * 60 * 24 });
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) await prisma.pushSubscription.delete({ where: { id: s.id } }).catch(() => {});
        else console.warn(`[push] no se pudo enviar a ${new URL(s.endpoint).host}: ${code ?? (e as Error).message}`);
      }
    }),
  );
}

/** Envía después de responder al usuario, para no hacerlo esperar. */
export function notifyLater(userIds: string[], payload: PushPayload) {
  try {
    after(() => notify(userIds, payload).catch(() => {}));
  } catch {
    notify(userIds, payload).catch(() => {});
  }
}

/** Avisa a los miembros activos de un proyecto con ciertos roles, menos a quien hizo la acción. */
export async function notifyProject(projectId: string, roles: ("SOCIO" | "ADMINISTRACION" | "CONSTRUCTOR")[], payload: PushPayload, exceptUserId?: string) {
  const members = await prisma.member.findMany({ where: { projectId, active: true, role: { in: roles } }, select: { userId: true } });
  notifyLater(
    members.map((m) => m.userId).filter((id) => id !== exceptUserId),
    payload,
  );
}

/**
 * Si un pago desde la caja chica la dejó por debajo del mínimo, avisa a socios y administración.
 * Solo avisa al cruzar el mínimo, no en cada pago siguiente.
 */
export async function checkCashLow(projectId: string, spentNow: number, exceptUserId?: string) {
  if (spentNow <= 0) return;
  const [project, deposits, cashPaid] = await Promise.all([
    prisma.project.findUnique({ where: { id: projectId }, select: { cashMinimum: true } }),
    prisma.cashDeposit.aggregate({ where: { projectId }, _sum: { amount: true } }),
    prisma.payment.aggregate({ where: { expense: { projectId }, source: "CAJA" }, _sum: { amount: true } }),
  ]);
  if (!project) return;
  const balance = (deposits._sum.amount ?? 0) - (cashPaid._sum.amount ?? 0);
  if (balance < project.cashMinimum && balance + spentNow >= project.cashMinimum) {
    const fmt = (n: number) => "₡" + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    await notifyProject(projectId, ["SOCIO", "ADMINISTRACION"], { title: "La caja chica bajó del mínimo", body: `Quedan ${fmt(balance)}. Toca recargarla.`, url: `/p/${projectId}/cuentas#caja`, tag: `cash-${projectId}` }, exceptUserId);
  }
}
