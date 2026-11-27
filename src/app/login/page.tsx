import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";
import { ActionForm } from "@/components/action-form";
import { Field, Input } from "@/components/ui";
import { login } from "@/lib/auth-actions";
import { prisma } from "@/lib/db";

export const metadata: Metadata = { title: "Entrar" };
export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  if ((await prisma.user.count()) === 0) redirect("/configurar");
  const { next } = await searchParams;
  return (
    <AuthShell title="Obra" subtitle="Gastos de la construcción, en orden." footer={<span>¿Olvidó la contraseña? Pídale a un socio un enlace nuevo desde Ajustes.</span>}>
      <ActionForm action={login} submitLabel="Entrar" pendingLabel="Entrando…" fullWidth>
        <input type="hidden" name="next" value={next ?? ""} />
        <Field label="Correo" htmlFor="email">
          <Input id="email" name="email" type="email" autoComplete="email" required inputMode="email" />
        </Field>
        <Field label="Contraseña" htmlFor="password">
          <Input id="password" name="password" type="password" autoComplete="current-password" required />
        </Field>
      </ActionForm>
      <p className="sr-only"><Link href="/configurar">Configurar</Link></p>
    </AuthShell>
  );
}
