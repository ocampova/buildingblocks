import type { Metadata } from "next";
import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import { ActionForm } from "@/components/action-form";
import { changePassword } from "@/lib/auth-actions";
import { PushSettings } from "@/components/push-prompt";
import { vapidPublicKey } from "@/lib/push";
import { InviteForm } from "@/components/invite-link";
import { Badge, Button, Card, Field, Input, Notice, PageHeader, PayerChip, SectionTitle, Select } from "@/components/ui";
import { isPartner, requireMember } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { crc, grouped } from "@/lib/format";
import { deleteStage, invite, moveStage, newInviteLink, removeMember, saveStage, updateProject, updateShares } from "@/lib/settings-actions";

export const metadata: Metadata = { title: "Ajustes" };

const ROLE = { SOCIO: "Socio", ADMINISTRACION: "Administración", CONSTRUCTOR: "Constructor" } as const;

export default async function Settings({ params, searchParams }: { params: Promise<{ projectId: string }>; searchParams: Promise<{ bienvenida?: string }> }) {
  const { projectId } = await params;
  const { bienvenida } = await searchParams;
  const member = await requireMember(projectId);
  const partner = isPartner(member.role);
  const [stages, members] = await Promise.all([
    prisma.stage.findMany({ where: { projectId }, orderBy: { position: "asc" }, include: { _count: { select: { expenses: true } } } }),
    prisma.member.findMany({ where: { projectId, active: true }, include: { user: { select: { name: true, email: true, passwordHash: true } } }, orderBy: [{ role: "asc" }, { createdAt: "asc" }] }),
  ]);
  const partners = members.filter((m) => m.role === "SOCIO");

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Ajustes" />
      {bienvenida && (
        <div className="mb-6">
          <Notice tone="brand">Proyecto creado. Ahora invite a su socio y a quien va a llevar las compras. Las etapas ya están listas; puede cambiarlas abajo.</Notice>
        </div>
      )}

      <SectionTitle>Personas</SectionTitle>
      <Card>
        <ul className="divide-y divide-line">
          {members.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center gap-3 px-4 py-3.5">
              {m.role === "SOCIO" ? <PayerChip name={m.user.name} color={m.color} /> : <span className="grid size-8 place-items-center rounded-full bg-sunken text-[12px] font-semibold text-ink-2">{m.user.name.slice(0, 1)}</span>}
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">
                  {m.user.name}
                  {m.id === member.id && <span className="font-normal text-ink-3"> (usted)</span>}
                </p>
                <p className="truncate text-[13.5px] text-ink-3">{m.user.email}</p>
              </div>
              <Badge tone={m.role === "SOCIO" ? "brand" : "neutral"}>
                {ROLE[m.role]}
                {m.role === "SOCIO" && ` · ${m.share ?? 0} %`}
              </Badge>
              {!m.user.passwordHash && <Badge tone="warn">Sin activar</Badge>}
              {partner && m.id !== member.id && (
                <div className="flex w-full items-start gap-2 pl-11 sm:w-auto sm:pl-0">
                  <InviteForm action={newInviteLink.bind(null, projectId, m.id)} submitLabel="Enlace nuevo" />
                  <form action={removeMember.bind(null, projectId, m.id)}>
                    <button aria-label={`Quitar a ${m.user.name}`} className="grid size-11 place-items-center rounded-control text-ink-3 hover:bg-danger-soft hover:text-danger">
                      <Trash2 className="size-4" aria-hidden />
                    </button>
                  </form>
                </div>
              )}
            </li>
          ))}
        </ul>
      </Card>

      {partner && (
        <Card className="mt-3 p-4 sm:p-5">
          <h3 className="mb-4 text-[16px] font-semibold">Invitar a alguien</h3>
          <InviteForm action={invite.bind(null, projectId)}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nombre" htmlFor="iname">
                <Input id="iname" name="name" required />
              </Field>
              <Field label="Correo" htmlFor="iemail">
                <Input id="iemail" name="email" type="email" required />
              </Field>
              <Field label="Rol" htmlFor="irole" hint="Socio: pone dinero y ve todo. Administración: cotiza y registra gastos. Constructor: pide materiales.">
                <Select id="irole" name="role" defaultValue={partners.length < 2 ? "SOCIO" : "ADMINISTRACION"}>
                  <option value="SOCIO">Socio</option>
                  <option value="ADMINISTRACION">Administración</option>
                  <option value="CONSTRUCTOR">Constructor</option>
                </Select>
              </Field>
            </div>
          </InviteForm>
        </Card>
      )}

      {partner && partners.length >= 2 && (
        <>
          <SectionTitle>Porcentaje de cada socio</SectionTitle>
          <Card className="p-4 sm:p-5">
            <ActionForm action={updateShares.bind(null, projectId)} submitLabel="Guardar porcentajes" resetOnOk={false} variant="secondary">
              <div className="grid gap-4 sm:grid-cols-2">
                {partners.map((p) => (
                  <Field key={p.id} label={p.user.name} htmlFor={`share-${p.id}`}>
                    <div className="relative">
                      <Input id={`share-${p.id}`} name={`share:${p.id}`} inputMode="numeric" defaultValue={String(p.share ?? 0)} className="pr-9" />
                      <span aria-hidden className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 font-semibold text-ink-3">%</span>
                    </div>
                  </Field>
                ))}
              </div>
            </ActionForm>
          </Card>
        </>
      )}

      <SectionTitle>Etapas</SectionTitle>
      <Card>
        <ul className="divide-y divide-line">
          {stages.map((s, i) => (
            <li key={s.id} className="px-4 py-3">
              <details className="group">
                <summary className="flex min-h-10 cursor-pointer list-none items-center gap-3">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{s.name}</span>
                    <span className="text-[13px] text-ink-3">
                      {s._count.expenses} {s._count.expenses === 1 ? "gasto" : "gastos"}
                      {s.budget ? ` · presupuesto ${crc(s.budget)}` : ""}
                      {s.kind === "GENERAL" ? " · no es obra" : ""}
                    </span>
                  </span>
                  {partner && <span className="text-[14px] font-semibold text-brand group-open:hidden">Editar</span>}
                </summary>
                {partner && (
                  <div className="mt-3 space-y-3 border-t border-line pt-3">
                    <ActionForm action={saveStage.bind(null, projectId, s.id)} submitLabel="Guardar" resetOnOk={false} variant="secondary">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Field label="Nombre" htmlFor={`sn-${s.id}`}>
                          <Input id={`sn-${s.id}`} name="name" defaultValue={s.name} required />
                        </Field>
                        <Field label="Presupuesto" htmlFor={`sb-${s.id}`} hint="Opcional">
                          <Input id={`sb-${s.id}`} name="budget" inputMode="numeric" defaultValue={s.budget ? grouped(s.budget) : ""} />
                        </Field>
                      </div>
                    </ActionForm>
                    <div className="flex flex-wrap gap-2">
                      <form action={moveStage.bind(null, projectId, s.id, -1)}>
                        <Button variant="ghost" disabled={i === 0} aria-label="Subir"><ArrowUp className="size-4" aria-hidden /> Subir</Button>
                      </form>
                      <form action={moveStage.bind(null, projectId, s.id, 1)}>
                        <Button variant="ghost" disabled={i === stages.length - 1} aria-label="Bajar"><ArrowDown className="size-4" aria-hidden /> Bajar</Button>
                      </form>
                      {s._count.expenses === 0 && (
                        <form action={deleteStage.bind(null, projectId, s.id)}>
                          <Button variant="danger"><Trash2 className="size-4" aria-hidden /> Quitar</Button>
                        </form>
                      )}
                    </div>
                  </div>
                )}
              </details>
            </li>
          ))}
        </ul>
      </Card>
      {partner && (
        <Card className="mt-3 p-4 sm:p-5">
          <h3 className="mb-4 text-[16px] font-semibold">Agregar etapa</h3>
          <ActionForm action={saveStage.bind(null, projectId, null)} submitLabel="Agregar etapa" variant="secondary">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Nombre" htmlFor="newstage">
                <Input id="newstage" name="name" required placeholder="Ej.: Ventanería" />
              </Field>
              <Field label="Presupuesto" htmlFor="newbudget" hint="Opcional">
                <Input id="newbudget" name="budget" inputMode="numeric" />
              </Field>
            </div>
          </ActionForm>
        </Card>
      )}

      {partner && (
        <>
          <SectionTitle>Proyecto</SectionTitle>
          <Card className="p-4 sm:p-5">
            <ActionForm action={updateProject.bind(null, projectId)} submitLabel="Guardar" resetOnOk={false} variant="secondary">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Nombre" htmlFor="pname">
                  <Input id="pname" name="name" defaultValue={member.project.name} required />
                </Field>
                <Field label="Ubicación de la obra" htmlFor="ploc" hint="Cantón y provincia. Se usa para buscar proveedores cerca.">
                  <Input id="ploc" name="location" defaultValue={member.project.location ?? ""} placeholder="Ej.: Grecia, Alajuela" />
                </Field>
                <Field label="Mínimo de la caja chica" htmlFor="pmin" hint="Avisa cuando la caja baja de este monto.">
                  <Input id="pmin" name="cashMinimum" inputMode="numeric" defaultValue={grouped(member.project.cashMinimum)} />
                </Field>
              </div>
            </ActionForm>
          </Card>
        </>
      )}

      <SectionTitle>Avisos en este dispositivo</SectionTitle>
      <Card className="p-4 sm:p-5">
        <PushSettings vapidKey={await vapidPublicKey()} />
      </Card>

      <SectionTitle>Su contraseña</SectionTitle>
      <Card className="p-4 sm:p-5">
        <ActionForm action={changePassword} submitLabel="Cambiar contraseña" variant="secondary">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Contraseña actual" htmlFor="pcur">
              <Input id="pcur" name="current" type="password" autoComplete="current-password" required />
            </Field>
            <Field label="Nueva" htmlFor="pnew" hint="Al menos 8 caracteres.">
              <Input id="pnew" name="password" type="password" autoComplete="new-password" minLength={8} required />
            </Field>
            <Field label="Repita la nueva" htmlFor="pconf">
              <Input id="pconf" name="confirm" type="password" autoComplete="new-password" required />
            </Field>
          </div>
        </ActionForm>
      </Card>

      <form action="/salir" method="post" className="mt-10">
        <Button variant="secondary" type="submit">Salir de Obra</Button>
      </form>
    </div>
  );
}
