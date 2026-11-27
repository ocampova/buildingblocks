import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { decodeSession, SESSION_COOKIE } from "@/lib/session";
import { parseHaciendaXml, totalInColones } from "@/lib/hacienda";
import { readReceipt, aiAvailable } from "@/lib/receipt-ai";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX = 10 * 1024 * 1024;
const IMAGE = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export type Prefill = {
  receiptType?: "FACTURA" | "TIQUETE" | "NOTA" | "COMPROBANTE";
  supplier?: string;
  date?: string;
  total?: number;
  description?: string;
  haciendaKey?: string;
  currency?: string;
  originalTotal?: number;
  exchangeRate?: number;
  lines?: { description: string; quantity: number; unitPrice: number; total: number }[];
};

export type UploadResult = {
  attachmentId: string;
  read: "xml" | "ia" | "none" | "unavailable";
  prefill: Prefill;
  duplicate?: { id: string; description: string };
};

/** Sube un respaldo (foto, PDF o XML) y devuelve lo que se pudo leer para llenar el gasto. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const session = await decodeSession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!session) return NextResponse.json({ error: "Su sesión venció. Entre de nuevo." }, { status: 401 });
  const member = await prisma.member.findFirst({ where: { projectId, userId: session.userId, active: true } });
  if (!member || member.role === "CONSTRUCTOR") return NextResponse.json({ error: "No tiene permiso para subir gastos." }, { status: 403 });

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No llegó ningún archivo." }, { status: 400 });
  if (file.size > MAX) return NextResponse.json({ error: "El archivo pesa más de 10 MB." }, { status: 413 });

  const isXml = /xml/.test(file.type) || /\.xml$/i.test(file.name);
  const mime = isXml ? "application/xml" : file.type;
  if (!isXml && mime !== "application/pdf" && !IMAGE.includes(mime)) {
    return NextResponse.json({ error: "Suba una foto (JPG o PNG), un PDF o el XML de la factura." }, { status: 415 });
  }
  const data = Buffer.from(await file.arrayBuffer());

  let read: UploadResult["read"] = "none";
  let prefill: Prefill = {};
  let duplicate: UploadResult["duplicate"];

  if (isXml) {
    const doc = parseHaciendaXml(data.toString("utf8"));
    if (!doc) return NextResponse.json({ error: "Ese XML no es una factura electrónica. Suba el XML de la factura, no el de la respuesta de Hacienda." }, { status: 422 });
    read = "xml";
    prefill = {
      receiptType: "FACTURA",
      supplier: doc.supplier,
      date: doc.date,
      total: totalInColones(doc),
      haciendaKey: doc.key,
      currency: doc.currency,
      originalTotal: doc.total,
      exchangeRate: doc.exchangeRate,
      description: summarize(doc.lines.map((l) => l.description)),
      lines: doc.lines.map((l) => ({ ...l, unitPrice: Math.round(l.unitPrice), total: Math.round(l.total) })),
    };
    const existing = await prisma.expense.findFirst({ where: { projectId, haciendaKey: doc.key }, select: { id: true, description: true } });
    if (existing) duplicate = existing;
  } else if (!aiAvailable()) {
    read = "unavailable";
  } else {
    const guess = await readReceipt({ data, mime });
    if (guess) {
      read = "ia";
      prefill = {
        receiptType: guess.kind === "OTRO" ? undefined : guess.kind,
        supplier: guess.supplier ?? undefined,
        date: guess.date && /^\d{4}-\d{2}-\d{2}$/.test(guess.date) ? guess.date : undefined,
        total: guess.total !== null && guess.currency === "CRC" ? Math.round(guess.total) : undefined,
        description: guess.description ?? undefined,
        lines: guess.lines
          .filter((l) => l.description)
          .map((l) => ({ description: l.description, quantity: l.quantity ?? 1, unitPrice: Math.round(l.unitPrice ?? 0), total: Math.round(l.total ?? 0) })),
      };
    }
  }

  const att = await prisma.attachment.create({
    data: { projectId, filename: file.name || "respaldo", mime, size: data.length, data, createdById: member.id },
    select: { id: true },
  });

  if (!duplicate && prefill.total && prefill.date) {
    const same = await prisma.expense.findFirst({
      where: { projectId, total: prefill.total, date: new Date(`${prefill.date}T00:00:00.000Z`) },
      select: { id: true, description: true },
    });
    if (same) duplicate = same;
  }

  return NextResponse.json({ attachmentId: att.id, read, prefill, duplicate } satisfies UploadResult);
}

function summarize(items: string[]) {
  const clean = items.map((s) => s.trim()).filter(Boolean);
  if (clean.length === 0) return undefined;
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
  if (clean.length <= 2) return clean.map(cap).join(" y ");
  return `${cap(clean[0])}, ${clean[1].toLowerCase()} y ${clean.length - 2} más`;
}
