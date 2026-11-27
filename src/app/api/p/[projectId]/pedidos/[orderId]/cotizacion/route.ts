import { NextResponse, type NextRequest } from "next/server";
import { aiAvailable } from "@/lib/ai";
import { prisma } from "@/lib/db";
import { readQuote } from "@/lib/orders-ai";
import { receiveUpload, storeAttachment } from "@/lib/uploads";

export const runtime = "nodejs";
export const maxDuration = 120;

export type QuoteRead = {
  attachmentId: string;
  read: "ia" | "none" | "unavailable";
  supplier?: string;
  date?: string;
  deliveryDays?: number;
  transport?: number;
  credit?: string;
  currency?: string;
  exchangeRate?: number;
  /** Por línea del pedido */
  lines: Record<string, { unitPrice?: number; brand?: string; quality: "CUMPLE" | "DISTINTA" | "NO_CLARO"; qualityNote?: string; description?: string }>;
  /** Líneas de la cotización que no corresponden a nada del pedido */
  extra: string[];
};

/** Sube una cotización (foto o PDF) y la alinea con las líneas del pedido. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ projectId: string; orderId: string }> }) {
  const { projectId, orderId } = await params;
  const up = await receiveUpload(req, projectId, (m) => m.role !== "CONSTRUCTOR");
  if (!up.ok) return NextResponse.json({ error: up.error }, { status: up.status });
  if (up.file.isXml) return NextResponse.json({ error: "Suba una foto o un PDF de la cotización." }, { status: 415 });
  const order = await prisma.order.findFirst({ where: { id: orderId, projectId }, include: { lines: { orderBy: { position: "asc" } } } });
  if (!order) return NextResponse.json({ error: "Ese pedido ya no existe." }, { status: 404 });
  const att = await storeAttachment(projectId, up.member.id, up.file);
  const base: QuoteRead = { attachmentId: att.id, read: "unavailable", lines: {}, extra: [] };
  if (!aiAvailable()) return NextResponse.json(base);

  const guess = await readQuote(up.file, order.lines);
  if (!guess) return NextResponse.json({ ...base, read: "none" } satisfies QuoteRead);
  const rate = guess.currency === "USD" ? guess.exchangeRate ?? undefined : undefined;
  const toCrc = (n: number | null) => (n === null ? undefined : Math.round(guess.currency === "USD" ? n * (rate ?? 0) : n));
  const lines: QuoteRead["lines"] = {};
  const extra: string[] = [];
  for (const l of guess.lines) {
    const ol = l.orderLine ? order.lines[l.orderLine - 1] : undefined;
    if (!ol) {
      extra.push(l.description);
      continue;
    }
    const unit = l.unitPrice ?? (l.total !== null && l.quantity ? l.total / l.quantity : null);
    // Si hay dos opciones para la misma línea, se queda la primera que cumpla
    if (lines[ol.id] && lines[ol.id].quality === "CUMPLE") continue;
    lines[ol.id] = { unitPrice: toCrc(unit), brand: l.brand ?? undefined, quality: l.quality, qualityNote: l.qualityNote ?? undefined, description: l.description };
  }
  return NextResponse.json({
    attachmentId: att.id,
    read: "ia",
    supplier: guess.supplier ?? undefined,
    date: guess.date && /^\d{4}-\d{2}-\d{2}$/.test(guess.date) ? guess.date : undefined,
    deliveryDays: guess.deliveryDays ?? undefined,
    transport: toCrc(guess.transport),
    credit: guess.credit ?? undefined,
    currency: guess.currency,
    exchangeRate: rate,
    lines,
    extra,
  } satisfies QuoteRead);
}
