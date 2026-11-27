import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { buildProjectExport } from "@/lib/export";
import { decodeSession, SESSION_COOKIE } from "@/lib/session";
import { xlsxResponse } from "@/lib/xlsx";

export const runtime = "nodejs";

/** Descarga en Excel de gastos y cuentas. Solo socios y administración. */
export async function GET(_: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const session = await decodeSession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!session) return new NextResponse("Su sesión venció. Entre de nuevo.", { status: 401 });
  const member = await prisma.member.findFirst({ where: { projectId, userId: session.userId, active: true } });
  if (!member || member.role === "CONSTRUCTOR") return new NextResponse("No existe", { status: 404 });
  const { buffer, filename } = await buildProjectExport(projectId);
  return xlsxResponse(buffer, filename);
}
