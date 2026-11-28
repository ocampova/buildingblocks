import "server-only";
import type { PaymentSource } from "@prisma/client";
import { getPartners } from "./data";

export type PaymentInput = { amount: number; source: PaymentSource; partnerId: string | null };

/** Convierte la opción de "quién pagó" en pagos. "mitad" reparte según el porcentaje de cada socio. */
export async function paymentsFor(projectId: string, payer: string, total: number): Promise<PaymentInput[] | { error: string }> {
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

