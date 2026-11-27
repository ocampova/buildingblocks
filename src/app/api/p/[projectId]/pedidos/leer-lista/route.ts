import { NextResponse, type NextRequest } from "next/server";
import { aiAvailable } from "@/lib/ai";
import { readMaterialList } from "@/lib/orders-ai";
import { receiveUpload, storeAttachment } from "@/lib/uploads";

export const runtime = "nodejs";
export const maxDuration = 60;

export type ListRead = {
  attachmentId: string;
  read: "ia" | "none" | "unavailable";
  lines: { material: string; quantity: number | null; unit: string | null; quality: string | null }[];
};

/** Sube la foto de una lista de materiales y devuelve las líneas que se pudieron leer. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const up = await receiveUpload(req, projectId, () => true);
  if (!up.ok) return NextResponse.json({ error: up.error }, { status: up.status });
  if (up.file.isXml) return NextResponse.json({ error: "Suba una foto o un PDF de la lista." }, { status: 415 });
  const att = await storeAttachment(projectId, up.member.id, up.file);
  if (!aiAvailable()) return NextResponse.json({ attachmentId: att.id, read: "unavailable", lines: [] } satisfies ListRead);
  const guess = await readMaterialList(up.file);
  return NextResponse.json({ attachmentId: att.id, read: guess && guess.lines.length ? "ia" : "none", lines: guess?.lines ?? [] } satisfies ListRead);
}
