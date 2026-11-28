import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Trash2 } from "lucide-react";
import { ActionForm } from "@/components/action-form";
import { ContractBar, ContractForm } from "@/components/contract-bits";
import { PayerRadios } from "@/components/payer-radios";
import { Button, Card, cx, Field, Input, noteBg, Notice, PayerChip, SectionTitle, Select } from "@/components/ui";
import { isPartner, requireMoneyMember } from "@/lib/auth";
import { addAbono, addExtra, deleteContract, deleteExtra, updateContract } from "@/lib/contract-actions";
import { getContracts, getPartners } from "@/lib/data";
import { prisma } from "@/lib/db";
import { crc, dateLabel, firstName, todayKey } from "@/lib/format";

export const metadata: Metadata = { title: "Contrato" };

export default async function ContractDetail({ params }: { params: Promise<{ projectId: string; contractId: string }> }) {
  const { projectId, contractId } = await params;
  const member = await requireMoneyMember(projectId);
  const [contracts, partners, stages] = await Promise.all([
    getContracts(projectId),
    getPartners(projectId),
    prisma.stage.findMany({ where: { projectId }, orderBy: { position: "asc" }, select: { id: true, name: true } }),
  ]);
  const c = contracts.find((x) => x.id === contractId);
  if (!c) notFound();
  const s = c.summary;
  const partner = isPartner(member.role);
  const today = todayKey();
  const payments = c.expenses.flatMap((e) => e.payments);

  return (
    <div className="mx-auto max-w-4xl">
      <Link href={`/p/${projectId}/contratos`} className="mb-3 inline-flex min-h-10 items-center gap-1.5 text-[14.5px] font-semibold text-brand">
        <ArrowLeft className="size-4" aria-hidden /> Contratos
      </Link>
      <header className="pb-6">
        <h1 className="text-balance text-[24px] font-semibold leading-tight tracking-[-0.02em] lg:text-[28px]">{c.contractor}</h1>
        <p className="mt-1 text-[15px] text-ink-2">
          {c.description}
          {c.signedAt ? `. Contrato del ${dateLabel(c.signedAt, { day: "numeric", month: "long", year: "numeric" })}` : ""}.
        </p>
      </header>

      <section className="rounded-card border border-line bg-surface p-5 shadow-raise lg:p-6">
        <h2 className="sr-only">Estado del contrato</h2>
        <p className="text-[15px] font-medium text-ink-2">{s.balance > 0 ? "Falta pagarle" : s.overpaid > 0 ? "Se le pagó de más" : "Contrato pagado"}</p>
        <p className="font-figure mt-1 text-[38px] font-semibold leading-none lg:text-[44px]">{crc(s.overpaid > 0 ? s.overpaid : s.balance)}</p>
        <div className="mt-5">
          <ContractBar summary={s} payments={payments} />
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-[14px] sm:grid-cols-4">
          <div>
            <dt className="text-ink-3">Contratado</dt>
            <dd className="tnum text-[16px] font-semibold">{crc(s.contracted)}</dd>
          </div>
          <div>
            <dt className="text-ink-3">Adicionales</dt>
            <dd className="tnum text-[16px] font-semibold">{crc(s.extras)}</dd>
          </div>
          <div>
            <dt className="text-ink-3">Total</dt>
            <dd className="tnum text-[16px] font-semibold">{crc(s.total)}</dd>
          </div>
          <div>
            <dt className="text-ink-3">Abonado</dt>
            <dd className="tnum text-[16px] font-semibold">
              {crc(s.paid)} <span className="text-[13px] font-normal text-ink-3">{Math.round(s.progress * 100)} %</span>
            </dd>
          </div>
        </dl>
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card className="p-4 sm:p-5">
          <h3 className="mb-4 text-[16px] font-semibold">Registrar un abono</h3>
          <ActionForm action={addAbono.bind(null, projectId, c.id)} submitLabel="Registrar abono">
            <PayerRadios partners={partners.map((p) => ({ id: p.id, name: p.user.name, color: p.color }))} defaultValue={member.role === "SOCIO" ? `socio:${member.id}` : undefined} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Monto" htmlFor="aamount" hint={s.balance > 0 ? `Saldo: ${crc(s.balance)}` : undefined}>
                <Input id="aamount" name="amount" inputMode="numeric" placeholder="₡" required />
              </Field>
              <Field label="Fecha" htmlFor="adate">
                <Input id="adate" name="date" type="date" defaultValue={today} max={today} />
              </Field>
              <Field label="Etapa" htmlFor="astage">
                <Select id="astage" name="stageId" defaultValue={c.stageId ?? ""} required>
                  <option value="" disabled>
                    Elija la etapa
                  </option>
                  {stages.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Nota" htmlFor="anote" hint="Opcional. Ej.: avance de cimientos">
                <Input id="anote" name="note" />
              </Field>
            </div>
          </ActionForm>
        </Card>

        <Card className="p-4 sm:p-5">
          <h3 className="mb-1 text-[16px] font-semibold">Agregar obra adicional</h3>
          <p className="mb-4 text-[14px] text-ink-2">Trabajos que cobra aparte del contrato. Suben el total; se pagan con abonos.</p>
          <ActionForm action={addExtra.bind(null, projectId, c.id)} submitLabel="Agregar adicional" variant="secondary">
            <Field label="Qué obra" htmlFor="edesc">
              <Input id="edesc" name="description" placeholder="Ej.: Muro de contención en lindero norte" required />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Monto" htmlFor="eamount">
                <Input id="eamount" name="amount" inputMode="numeric" placeholder="₡" required />
              </Field>
              <Field label="Fecha" htmlFor="edate">
                <Input id="edate" name="date" type="date" defaultValue={today} />
              </Field>
            </div>
          </ActionForm>
        </Card>
      </div>

      <SectionTitle>Abonos</SectionTitle>
      {c.expenses.length === 0 ? (
        <p className="text-[14.5px] text-ink-2">Todavía no hay abonos.</p>
      ) : (
        <Card>
          <ul className="divide-y divide-line">
            {[...c.expenses].reverse().map((e) => {
              const paid = e.payments.reduce((a, p) => a + p.amount, 0);
              const who = [...new Set(e.payments.map((p) => (p.source === "CAJA" ? "Caja chica" : firstName(p.partner!.user.name))))].join(" y ");
              const first = e.payments[0];
              return (
                <li key={e.id}>
                  <Link href={`/p/${projectId}/gastos/${e.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-sunken/60">
                    {e.payments.length > 1 ? (
                      <span aria-hidden className="relative size-9 shrink-0">
                        {e.payments.slice(0, 2).map((p, i) => (
                          <span key={i} className={cx("absolute size-6 rounded-full ring-2 ring-surface", noteBg(p.source === "CAJA" ? "caja" : p.partner!.color), i === 0 ? "left-0 top-0" : "bottom-0 right-0")} />
                        ))}
                      </span>
                    ) : first ? (
                      <PayerChip name={first.partner?.user.name ?? "Caja"} color={first.source === "CAJA" ? "caja" : first.partner!.color} />
                    ) : (
                      <span aria-hidden className="size-9 shrink-0 rounded-full border-2 border-dashed border-line-strong" />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{e.description}</span>
                      <span className="block text-[13.5px] text-ink-3">
                        {dateLabel(e.date, { day: "numeric", month: "short", year: "numeric" })}
                        {who ? ` · ${who}` : " · sin pagar"}
                      </span>
                    </span>
                    <span className="tnum shrink-0 font-semibold">{crc(paid || e.total)}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      <SectionTitle>Obras adicionales</SectionTitle>
      {c.extras.length === 0 ? (
        <p className="text-[14.5px] text-ink-2">No hay obras adicionales.</p>
      ) : (
        <Card>
          <ul className="divide-y divide-line">
            {c.extras.map((x) => (
              <li key={x.id} className="flex items-center gap-3 px-4 py-3">
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{x.description}</span>
                  <span className="block text-[13.5px] text-ink-3">{dateLabel(x.date, { day: "numeric", month: "short", year: "numeric" })}</span>
                </span>
                <span className="tnum shrink-0 font-semibold">{crc(x.amount)}</span>
                {partner && (
                  <form action={deleteExtra.bind(null, projectId, x.id)}>
                    <button aria-label={`Quitar ${x.description}`} className="grid size-9 place-items-center rounded-full text-ink-3 hover:bg-danger-soft hover:text-danger">
                      <Trash2 className="size-4" aria-hidden />
                    </button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {c.notes && (
        <div className="mt-6">
          <Notice tone="brand">{c.notes}</Notice>
        </div>
      )}

      <details className="mt-8 rounded-card border border-line bg-surface">
        <summary className="flex min-h-12 cursor-pointer items-center px-4 text-[15px] font-semibold sm:px-5">Editar contrato</summary>
        <div className="border-t border-line p-4 sm:p-5">
          <ContractForm action={updateContract.bind(null, projectId, c.id)} stages={stages} initial={c} submitLabel="Guardar cambios" />
        </div>
      </details>

      {partner && (
        <form action={deleteContract.bind(null, projectId, c.id)} className="mt-6">
          <Button variant="danger" type="submit">
            <Trash2 className="size-4" aria-hidden /> Borrar contrato
          </Button>
          <p className="mt-2 text-[13px] text-ink-3">Los abonos ya registrados se quedan como gastos normales.</p>
        </form>
      )}
    </div>
  );
}
