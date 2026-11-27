import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { ActionForm } from "@/components/action-form";
import { Field, Input } from "@/components/ui";
import { activate } from "@/lib/auth-actions";
import { findValidToken } from "@/lib/tokens";

export const metadata: Metadata = { title: "Activar cuenta" };
export const dynamic = "force-dynamic";

export default async function ActivatePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const t = await findValidToken(token);
  if (!t) {
    return (
      <AuthShell title="Enlace vencido" subtitle="Este enlace ya se usó o venció.">
        <p className="text-[15px] text-ink-2">Pídale a un socio que le envíe uno nuevo desde Ajustes.</p>
        <Link href="/login" className="mt-4 inline-block font-semibold text-brand underline">Ir a entrar</Link>
      </AuthShell>
    );
  }
  return (
    <AuthShell title={`Hola, ${t.user.name.split(" ")[0]}`} subtitle="Elija una contraseña para entrar a Obra.">
      <ActionForm action={activate.bind(null, token)} submitLabel="Guardar y entrar" pendingLabel="Guardando…" fullWidth resetOnOk={false}>
        <p className="text-[14px] text-ink-2">Correo: <span className="font-semibold text-ink">{t.user.email}</span></p>
        <Field label="Contraseña" htmlFor="password" hint="Al menos 8 caracteres.">
          <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} />
        </Field>
        <Field label="Repita la contraseña" htmlFor="confirm">
          <Input id="confirm" name="confirm" type="password" autoComplete="new-password" required />
        </Field>
      </ActionForm>
    </AuthShell>
  );
}
