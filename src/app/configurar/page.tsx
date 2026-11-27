import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";
import { ActionForm } from "@/components/action-form";
import { Field, Input } from "@/components/ui";
import { setup } from "@/lib/auth-actions";
import { prisma } from "@/lib/db";

export const metadata: Metadata = { title: "Configurar" };
export const dynamic = "force-dynamic";

export default async function SetupPage() {
  if ((await prisma.user.count()) > 0) redirect("/login");
  return (
    <AuthShell title="Empecemos" subtitle="Cree el proyecto y su cuenta de socio.">
      <ActionForm action={setup} submitLabel="Crear proyecto" pendingLabel="Creando…" fullWidth resetOnOk={false}>
        <Field label="Nombre del proyecto" htmlFor="project" hint="Por ejemplo: Apartamentos San Rafael">
          <Input id="project" name="project" required />
        </Field>
        <Field label="Su nombre" htmlFor="name">
          <Input id="name" name="name" autoComplete="name" required />
        </Field>
        <Field label="Correo" htmlFor="email">
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </Field>
        <Field label="Contraseña" htmlFor="password" hint="Al menos 8 caracteres.">
          <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} />
        </Field>
      </ActionForm>
    </AuthShell>
  );
}
