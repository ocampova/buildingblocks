"use server";

import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { ActionState } from "@/components/action-form";
import { prisma } from "./db";
import { decodeSession, encodeSession, SESSION_COOKIE, sessionCookieOptions } from "./session";
import { findValidToken } from "./tokens";
import { DEFAULT_STAGES } from "./stages";

async function startSession(userId: string) {
  const store = await cookies();
  store.set(SESSION_COOKIE, await encodeSession({ userId }), sessionCookieOptions);
}

function safeNext(next: FormDataEntryValue | null) {
  const s = typeof next === "string" ? next : "";
  return s.startsWith("/") && !s.startsWith("//") ? s : "/";
}

export async function login(_: ActionState, form: FormData): Promise<ActionState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  if (!email || !password) return { error: "Escriba su correo y su contraseña." };
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.active || !user.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
    return { error: "El correo o la contraseña no coinciden." };
  }
  await startSession(user.id);
  redirect(safeNext(form.get("next")));
}

export async function logout() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  redirect("/login");
}

const SetupSchema = z.object({
  project: z.string().trim().min(2, "Escriba el nombre del proyecto."),
  name: z.string().trim().min(2, "Escriba su nombre."),
  email: z.email("El correo no es válido.").transform((s) => s.toLowerCase()),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres."),
});

/** Primera vez: crea el proyecto, sus etapas y al primer socio. Solo si no hay usuarios. */
export async function setup(_: ActionState, form: FormData): Promise<ActionState> {
  if ((await prisma.user.count()) > 0) return { error: "Obra ya está configurada. Entre con su cuenta." };
  const parsed = SetupSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { project, name, email, password } = parsed.data;
  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash: await bcrypt.hash(password, 10),
      memberships: {
        create: {
          role: "SOCIO",
          share: 50,
          color: 0,
          project: {
            create: {
              name: project,
              cashMinimum: 300_000,
              stages: { create: DEFAULT_STAGES.map((s, i) => ({ name: s.name, kind: s.kind, position: i })) },
            },
          },
        },
      },
    },
    include: { memberships: true },
  });
  await startSession(user.id);
  redirect(`/p/${user.memberships[0].projectId}/ajustes?bienvenida=1`);
}

const ActivateSchema = z.object({
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres."),
  confirm: z.string(),
});

export async function activate(token: string, _: ActionState, form: FormData): Promise<ActionState> {
  const parsed = ActivateSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (parsed.data.password !== parsed.data.confirm) return { error: "Las dos contraseñas no coinciden." };
  const t = await findValidToken(token);
  if (!t) return { error: "Este enlace ya se usó o venció. Pida uno nuevo." };
  await prisma.$transaction([
    prisma.user.update({ where: { id: t.userId }, data: { passwordHash: await bcrypt.hash(parsed.data.password, 10) } }),
    prisma.authToken.update({ where: { id: t.id }, data: { usedAt: new Date() } }),
  ]);
  await startSession(t.userId);
  redirect("/");
}

const ChangeSchema = z.object({
  current: z.string().min(1, "Escriba su contraseña actual."),
  password: z.string().min(8, "La contraseña nueva debe tener al menos 8 caracteres."),
  confirm: z.string(),
});

/** Cambiar la propia contraseña desde Ajustes. */
export async function changePassword(_: ActionState, form: FormData): Promise<ActionState> {
  const store = await cookies();
  const session = await decodeSession(store.get(SESSION_COOKIE)?.value);
  if (!session) return { error: "Su sesión venció. Entre de nuevo." };
  const parsed = ChangeSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (parsed.data.password !== parsed.data.confirm) return { error: "Las dos contraseñas nuevas no coinciden." };
  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user?.passwordHash || !(await bcrypt.compare(parsed.data.current, user.passwordHash))) return { error: "La contraseña actual no es correcta." };
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(parsed.data.password, 10) } });
  return { ok: "Contraseña cambiada." };
}
