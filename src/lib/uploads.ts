import "server-only";
import { cookies } from "next/headers";
import type { Member } from "@prisma/client";
import { prisma } from "./db";
import { decodeSession, SESSION_COOKIE } from "./session";

const MAX = 10 * 1024 * 1024;
const IMAGE = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export type UploadOk = { ok: true; member: Member; file: { data: Buffer; mime: string; name: string; isXml: boolean } };
export type UploadErr = { ok: false; status: number; error: string };

/** Valida la sesión, la membresía y el archivo de una subida. */
export async function receiveUpload(req: Request, projectId: string, allow: (m: Member) => boolean): Promise<UploadOk | UploadErr> {
  const session = await decodeSession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!session) return { ok: false, status: 401, error: "Su sesión venció. Entre de nuevo." };
  const member = await prisma.member.findFirst({ where: { projectId, userId: session.userId, active: true } });
  if (!member || !allow(member)) return { ok: false, status: 403, error: "No tiene permiso para subir archivos aquí." };
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return { ok: false, status: 400, error: "No llegó ningún archivo." };
  if (file.size > MAX) return { ok: false, status: 413, error: "El archivo pesa más de 10 MB." };
  const isXml = /xml/.test(file.type) || /\.xml$/i.test(file.name);
  const mime = isXml ? "application/xml" : file.type;
  if (!isXml && mime !== "application/pdf" && !IMAGE.includes(mime)) {
    return { ok: false, status: 415, error: "Suba una foto (JPG o PNG), un PDF o un XML." };
  }
  return { ok: true, member, file: { data: Buffer.from(await file.arrayBuffer()), mime, name: file.name || "archivo", isXml } };
}

export async function storeAttachment(projectId: string, memberId: string, file: { data: Buffer; mime: string; name: string }) {
  return prisma.attachment.create({
    data: { projectId, filename: file.name, mime: file.mime, size: file.data.length, data: new Uint8Array(file.data), createdById: memberId },
    select: { id: true },
  });
}
