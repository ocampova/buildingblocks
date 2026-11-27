import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { prisma } from "./db";
import { decodeSession, SESSION_COOKIE } from "./session";

export const getCurrentUser = cache(async () => {
  const store = await cookies();
  const session = await decodeSession(store.get(SESSION_COOKIE)?.value);
  if (!session) return null;
  return prisma.user.findFirst({
    where: { id: session.userId, active: true },
    select: { id: true, name: true, email: true },
  });
});

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** Miembro activo del proyecto. Si no pertenece, 404 (no revela que el proyecto existe). */
export const requireMember = cache(async (projectId: string) => {
  const user = await requireUser();
  const member = await prisma.member.findFirst({
    where: { projectId, userId: user.id, active: true },
    include: { project: true, user: { select: { id: true, name: true, email: true } } },
  });
  if (!member) notFound();
  return member;
});

export type CurrentMember = Awaited<ReturnType<typeof requireMember>>;

/** Quién puede registrar gastos y ver el dinero: socios y administración. */
export function handlesMoney(role: Role) {
  return role === "SOCIO" || role === "ADMINISTRACION";
}

/** Ve las cuentas entre socios y la caja chica. El constructor no. */
export function seesPartnerAccounts(role: Role) {
  return role === "SOCIO" || role === "ADMINISTRACION";
}

export function isPartner(role: Role) {
  return role === "SOCIO";
}

export async function requireMoneyMember(projectId: string) {
  const m = await requireMember(projectId);
  if (!handlesMoney(m.role)) redirect(`/p/${projectId}`);
  return m;
}

export async function requirePartner(projectId: string) {
  const m = await requireMember(projectId);
  if (!isPartner(m.role)) redirect(`/p/${projectId}`);
  return m;
}
