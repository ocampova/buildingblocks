import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { decodeSession, SESSION_COOKIE } from "@/lib/session";

export const runtime = "nodejs";

/** Sirve un respaldo solo a miembros del proyecto que manejan dinero. */
export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await decodeSession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!session) return new NextResponse("No autorizado", { status: 401 });
  const att = await prisma.attachment.findUnique({ where: { id } });
  if (!att) return new NextResponse("No existe", { status: 404 });
  const member = await prisma.member.findFirst({ where: { projectId: att.projectId, userId: session.userId, active: true } });
  if (!member || member.role === "CONSTRUCTOR") return new NextResponse("No existe", { status: 404 });
  const safeName = att.filename.replace(/[^\w.\- ]/g, "_");
  return new NextResponse(new Uint8Array(att.data), {
    headers: {
      "Content-Type": att.mime === "application/xml" ? "text/plain; charset=utf-8" : att.mime,
      "Content-Disposition": `inline; filename="${safeName}"`,
      "Cache-Control": "private, max-age=86400",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
