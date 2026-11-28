import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText, Trash2 } from "lucide-react";
import { ActionForm } from "@/components/action-form";
import { AttachButton } from "@/components/attach-button";
import { PayerRadios } from "@/components/payer-radios";
import { Badge, Button, Card, Field, Input, Notice, PayerChip, SectionTitle, Select, Textarea } from "@/components/ui";
import { isPartner, requireMoneyMember } from "@/lib/auth";
import { getPartners } from "@/lib/data";
import { prisma } from "@/lib/db";
import { addPayment, attachToExpense, deleteAttachment, deleteExpense, deletePayment, updateExpense } from "@/lib/expense-actions";
import { crc, dateKey, dateLabel, firstName, grouped, todayKey } from "@/lib/format";

export const metadata: Metadata = { title: "Gasto" };

const RECEIPT = { FACTURA: "Factura", TIQUETE: "Tiquete o recibo", NOTA: "Nota a mano", COMPROBANTE: "Comprobante de pago", NINGUNO: "Sin respaldo" } as const;

export default async function ExpenseDetail({ params, searchParams }: { params: Promise<{ projectId: string; expenseId: string }>; searchParams: Promise<{ guardado?: string }> }) {
  const { projectId, expenseId } = await params;
  const { guardado } = await searchParams;
  const member = await requireMoneyMember(projectId);
  const e = await prisma.expense.findFirst({
    where: { id: expenseId, projectId },
    include: {
      stage: true,
      lines: true,
      order: { select: { id: true, number: true, title: true } },
      contract: { select: { id: true, contractor: true } },
      createdBy: { include: { user: { select: { name: true } } } },
      payments: { include: { partner: { include: { user: { select: { name: true } } } }, attachments: { select: { id: true, mime: true, filename: true } } }, orderBy: { date: "asc" } },
      attachments: { select: { id: true, mime: true, filename: true }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!e) notFound();
  const [partners, stages] = await Promise.all([getPartners(projectId), prisma.stage.findMany({ where: { projectId }, orderBy: { position: "asc" } })]);
  const paid = e.payments.reduce((s, p) => s + p.amount, 0);
  const pending = e.total - paid;
  const canDelete = isPartner(member.role);
  const partnerOpts = partners.map((p) => ({ id: p.id, name: p.user.name, color: p.color }));
  const allAttachments = [...e.attachments, ...e.payments.flatMap((p) => p.attachments)];

  return (
    <div className="mx-auto max-w-3xl">
      <Link href={`/p/${projectId}/gastos`} className="mb-3 inline-flex min-h-10 items-center gap-1.5 text-[14.5px] font-semibold text-brand">
        <ArrowLeft className="size-4" aria-hidden /> Gastos
      </Link>

      {guardado && (
        <div className="rise mb-4 flex flex-wrap items-center justify-between gap-3 rounded-control border border-ok/25 bg-ok-soft px-4 py-3">
          <p className="text-[15px] font-semibold text-ok">Gasto guardado.</p>
          <Link href={`/p/${projectId}/gastos/nuevo`} className="text-[14.5px] font-semibold text-ok underline">
            Registrar otro
          </Link>
        </div>
      )}

      <header className="pb-6">
        <h1 className="text-balance text-[24px] font-semibold leading-tight tracking-[-0.02em] lg:text-[28px]">{e.description}</h1>
        <p className="mt-1 text-[14.5px] text-ink-2">
          {e.stage.name}, {dateLabel(e.date, { day: "numeric", month: "long", year: "numeric" })}
        </p>
        <p className="font-figure mt-4 text-[40px] font-semibold leading-none">{crc(e.total)}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {pending === 0 ? <Badge tone="ok">Pagado</Badge> : paid === 0 ? <Badge tone="warn">Por pagar {crc(pending)}</Badge> : <Badge tone="warn">Falta {crc(pending)}</Badge>}
          <Badge tone={e.receiptType === "NINGUNO" ? "danger" : e.receiptType === "FACTURA" ? "brand" : "neutral"}>{RECEIPT[e.receiptType]}</Badge>
          {e.dueDate && pending > 0 && <Badge tone="warn">Vence el {dateLabel(e.dueDate)}</Badge>}
        </div>
        {e.supplier && <p className="mt-3 text-[15px] text-ink-2">Pagado a <span className="font-semibold text-ink">{e.supplier}</span></p>}
        {e.contract && (
          <p className="mt-1 text-[15px] text-ink-2">
            Abono al{" "}
            <Link href={`/p/${projectId}/contratos/${e.contract.id}`} className="font-semibold text-brand underline">
              contrato de {e.contract.contractor}
            </Link>
          </p>
        )}
        {e.order && (
          <p className="mt-1 text-[15px] text-ink-2">
            Compra del{" "}
            <Link href={`/p/${projectId}/pedidos/${e.order.id}`} className="font-semibold text-brand underline">
              pedido {e.order.number}: {e.order.title}
            </Link>
          </p>
        )}
        {e.originalUsdCents && <p className="mt-1 text-[14px] text-ink-3">Factura en dólares: US${(e.originalUsdCents / 100).toLocaleString("en-US")} al tipo de cambio {e.exchangeRate}.</p>}
      </header>

      <SectionTitle>Respaldos</SectionTitle>
      <div className="flex flex-wrap gap-2.5">
        {allAttachments.map((a) => (
          <div key={a.id} className="group relative">
            <a href={`/api/adjuntos/${a.id}`} target="_blank" rel="noreferrer" className="block" aria-label={`Abrir ${a.filename}`}>
              {a.mime.startsWith("image/") ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`/api/adjuntos/${a.id}`} alt="" className="h-24 w-20 rounded-control border border-line object-cover" />
              ) : (
                <span className="grid h-24 w-20 place-items-center rounded-control border border-line bg-sunken text-center text-[11.5px] font-semibold text-ink-2">
                  <span><FileText className="mx-auto mb-1 size-6" aria-hidden />{a.mime === "application/pdf" ? "PDF" : "XML"}</span>
                </span>
              )}
            </a>
            {canDelete && (
              <form action={deleteAttachment.bind(null, projectId, a.id)}>
                <button aria-label={`Quitar ${a.filename}`} className="absolute -right-2 -top-2 grid size-7 place-items-center rounded-full bg-surface text-danger shadow-raise ring-1 ring-line">
                  <Trash2 className="size-3.5" aria-hidden />
                </button>
              </form>
            )}
          </div>
        ))}
        <AttachButton projectId={projectId} onUploaded={attachToExpense.bind(null, projectId, e.id)} />
      </div>
      {allAttachments.length === 0 && <p className="mt-2 text-[14px] text-ink-3">Este gasto no tiene respaldo. Agregue una foto del recibo o del comprobante.</p>}

      {e.lines.length > 0 && (
        <>
          <SectionTitle>Detalle</SectionTitle>
          <Card>
            <ul className="divide-y divide-line text-[14.5px]">
              {e.lines.map((l) => (
                <li key={l.id} className="flex justify-between gap-3 px-4 py-2.5">
                  <span className="min-w-0 text-ink-2">
                    <span className="tnum">{l.quantity}</span> × {l.description}
                  </span>
                  <span className="tnum shrink-0 font-medium">{crc(l.total)}</span>
                </li>
              ))}
            </ul>
          </Card>
        </>
      )}

      <SectionTitle>Pagos</SectionTitle>
      <Card>
        {e.payments.length === 0 ? (
          <p className="px-4 py-4 text-[14.5px] text-ink-2">Todavía no se ha pagado nada.</p>
        ) : (
          <ul className="divide-y divide-line">
            {e.payments.map((p) => (
              <li key={p.id} className="flex items-center gap-3 px-4 py-3">
                <PayerChip name={p.partner?.user.name ?? "Caja"} color={p.source === "CAJA" ? "caja" : p.partner!.color} />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{p.source === "CAJA" ? "Caja chica" : firstName(p.partner!.user.name)}</p>
                  <p className="text-[13.5px] text-ink-3">{dateLabel(p.date, { day: "numeric", month: "short", year: "numeric" })}</p>
                </div>
                <p className="tnum font-semibold">{crc(p.amount)}</p>
                {canDelete && (
                  <form action={deletePayment.bind(null, projectId, p.id)}>
                    <button aria-label="Borrar este pago" className="grid size-9 place-items-center rounded-full text-ink-3 hover:bg-danger-soft hover:text-danger">
                      <Trash2 className="size-4" aria-hidden />
                    </button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {pending > 0 && (
        <Card className="mt-3 p-4 sm:p-5">
          <h3 className="mb-4 text-[16px] font-semibold">Registrar un pago</h3>
          <ActionForm action={addPayment.bind(null, projectId, e.id)} submitLabel="Registrar pago">
            <PayerRadios partners={partnerOpts} defaultValue={member.role === "SOCIO" ? `socio:${member.id}` : undefined} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Monto" htmlFor="amount" hint={`Pendiente: ${crc(pending)}`}>
                <Input id="amount" name="amount" inputMode="numeric" defaultValue={grouped(pending)} required />
              </Field>
              <Field label="Fecha" htmlFor="pdate">
                <Input id="pdate" name="date" type="date" defaultValue={todayKey()} max={todayKey()} required />
              </Field>
            </div>
          </ActionForm>
        </Card>
      )}

      <details className="mt-8 rounded-card border border-line bg-surface">
        <summary className="flex min-h-12 cursor-pointer items-center px-4 text-[15px] font-semibold sm:px-5">Editar gasto</summary>
        <div className="border-t border-line p-4 sm:p-5">
          <ActionForm action={updateExpense.bind(null, projectId, e.id)} submitLabel="Guardar cambios" resetOnOk={false}>
            <Field label="Descripción" htmlFor="description">
              <Input id="description" name="description" defaultValue={e.description} required />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Monto" htmlFor="total">
                <Input id="total" name="total" inputMode="numeric" defaultValue={grouped(e.total)} required />
              </Field>
              <Field label="Etapa" htmlFor="stageId">
                <Select id="stageId" name="stageId" defaultValue={e.stageId}>
                  {stages.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </Select>
              </Field>
              <Field label="A quién se le pagó" htmlFor="supplier">
                <Input id="supplier" name="supplier" defaultValue={e.supplier ?? ""} />
              </Field>
              <Field label="Tipo de respaldo" htmlFor="receiptType">
                <Select id="receiptType" name="receiptType" defaultValue={e.receiptType}>
                  {Object.entries(RECEIPT).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Fecha" htmlFor="date">
                <Input id="date" name="date" type="date" defaultValue={dateKey(e.date)} required />
              </Field>
              <Field label="Vence el" htmlFor="dueDate" hint="Solo si queda algo por pagar">
                <Input id="dueDate" name="dueDate" type="date" defaultValue={e.dueDate ? dateKey(e.dueDate) : ""} />
              </Field>
            </div>
            <Field label="Notas" htmlFor="notes">
              <Textarea id="notes" name="notes" defaultValue={e.notes ?? ""} />
            </Field>
          </ActionForm>
        </div>
      </details>

      {canDelete && (
        <form action={deleteExpense.bind(null, projectId, e.id)} className="mt-6">
          <Button variant="danger" type="submit">
            <Trash2 className="size-4" aria-hidden /> Borrar gasto
          </Button>
          <p className="mt-2 text-[13px] text-ink-3">Borra también sus pagos y respaldos. No se puede deshacer.</p>
        </form>
      )}

      <p className="mt-8 text-[13px] text-ink-3">
        Registrado por {e.createdBy.user.name} el {dateLabel(e.createdAt, { day: "numeric", month: "short", year: "numeric" })}.
      </p>
      {e.haciendaKey && <p className="tnum mt-1 break-all text-[12px] text-ink-3">Clave: {e.haciendaKey}</p>}
      {pending > 0 && e.payments.length === 0 && <div className="mt-4"><Notice tone="brand">Mientras no se pague, este gasto no cuenta en las cuentas entre socios.</Notice></div>}
    </div>
  );
}
