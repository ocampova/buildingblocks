import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText, PackageCheck, ReceiptText } from "lucide-react";
import { ActionForm } from "@/components/action-form";
import { ComparisonView } from "@/components/comparison";
import { DeadlineBadge, StatusSteps } from "@/components/order-bits";
import { PayerRadios } from "@/components/payer-radios";
import { QuoteEditor } from "@/components/quote-editor";
import { SupplierFinder } from "@/components/supplier-finder";
import type { SupplierSearch } from "@/lib/supplier-ai";
import { Button, Card, Field, Input, Notice, SectionTitle, Select, Textarea } from "@/components/ui";
import { aiAvailable } from "@/lib/ai";
import { handlesMoney, requireMember } from "@/lib/auth";
import { compareQuotes } from "@/lib/compare";
import { getPartners } from "@/lib/data";
import { prisma } from "@/lib/db";
import { crc, dateKey, dateLabel, quantityLabel, todayKey } from "@/lib/format";
import { buyOrder, cancelOrder, chooseLines, deleteQuote, findSuppliers, receiveOrder, saveQuote, saveSupplier, updateNeededBy } from "@/lib/order-actions";

export const metadata: Metadata = { title: "Pedido" };

export default async function OrderDetail({ params, searchParams }: { params: Promise<{ projectId: string; orderId: string }>; searchParams: Promise<{ creado?: string; comprado?: string }> }) {
  const { projectId, orderId } = await params;
  const { creado, comprado } = await searchParams;
  const member = await requireMember(projectId);
  const order = await prisma.order.findFirst({
    where: { id: orderId, projectId },
    include: {
      stage: true,
      createdBy: { include: { user: { select: { name: true } } } },
      lines: { orderBy: { position: "asc" } },
      quotes: { include: { supplier: true, lines: true, attachments: { select: { id: true } } }, orderBy: { createdAt: "asc" } },
      expenses: { select: { id: true, total: true, supplier: true, payments: { select: { amount: true } } } },
      attachments: { select: { id: true, mime: true, filename: true } },
    },
  });
  if (!order) notFound();
  const money = handlesMoney(member.role);
  const open = order.status === "POR_COTIZAR" || order.status === "COTIZADO";
  const today = todayKey();
  const [partners, stages, suppliers] = money
    ? await Promise.all([
        getPartners(projectId),
        prisma.stage.findMany({ where: { projectId }, orderBy: { position: "asc" } }),
        prisma.supplier.findMany({ where: { projectId }, orderBy: { name: "asc" }, select: { name: true, phone: true } }),
      ])
    : [[], [], []];

  const cmp = compareQuotes(
    order.lines.map((l) => ({ id: l.id, quantity: l.quantity })),
    order.quotes.map((q) => ({ id: q.id, transport: q.transport, lines: q.lines.map((l) => ({ id: l.id, orderLineId: l.orderLineId, unitPrice: l.unitPrice, quality: l.quality })) })),
  );
  const cmpLines = order.lines.map((l) => ({ id: l.id, material: l.material, quantity: l.quantity, unit: l.unit, quality: l.quality, chosenId: l.chosenId }));
  const cmpQuotes = order.quotes.map((q) => {
    const byLine = Object.fromEntries(
      q.lines.filter((l) => l.orderLineId).map((l) => [l.orderLineId!, { id: l.id, unitPrice: l.unitPrice, brand: l.brand, quality: l.quality, qualityNote: l.qualityNote }]),
    );
    return {
      id: q.id,
      supplier: q.supplier.name,
      deliveryDays: q.deliveryDays,
      transport: q.transport,
      credit: q.credit,
      attachmentIds: q.attachments.map((a) => a.id),
      lines: byLine,
      initial: {
        id: q.id,
        supplier: q.supplier.name,
        date: dateKey(q.date),
        deliveryDays: q.deliveryDays,
        transport: q.transport,
        credit: q.credit,
        notes: q.notes,
        readByAi: q.readByAi,
        lines: Object.fromEntries(Object.entries(byLine).map(([k, v]) => [k, { unitPrice: v.unitPrice, brand: v.brand, quality: v.quality, qualityNote: v.qualityNote }])),
      },
    };
  });
  const chosen = order.lines.filter((l) => l.chosenId).length;
  const quoteMessage = [
    `Hola, buenas. Le escribimos de ${member.project.name}${member.project.location ? ` en ${member.project.location}` : ""}. Quisiéramos una cotización de:`,
    "",
    ...order.lines.map((l) => `• ${quantityLabel(l.quantity, l.unit)} de ${l.material}${l.quality ? ` (${l.quality})` : ""}`),
    "",
    `Los necesitamos para el ${dateLabel(order.neededBy, { weekday: "long", day: "numeric", month: "long" })}. ¿Tienen transporte a la obra y cuánto cuesta? ¿Dan crédito?`,
    "",
    "Muchas gracias.",
  ].join("\n");
  const spent = order.expenses.reduce((s, e) => s + e.total, 0);

  return (
    <div className="mx-auto max-w-5xl">
      <Link href={`/p/${projectId}/pedidos`} className="mb-3 inline-flex min-h-10 items-center gap-1.5 text-[14.5px] font-semibold text-brand">
        <ArrowLeft className="size-4" aria-hidden /> Pedidos
      </Link>

      {creado && (
        <div className="rise mb-4">
          <Notice tone="ok">Pedido enviado. {money ? "Ya puede agregar cotizaciones." : "Le avisamos cuando se compre."}</Notice>
        </div>
      )}

      {comprado && (
        <div className="rise mb-4">
          <Notice tone="ok">{comprado === "1" ? "Compra registrada como gasto." : `Compra registrada: ${comprado} gastos, uno por proveedor.`} Le avisamos al constructor.</Notice>
        </div>
      )}

      <header className="flex flex-wrap items-start justify-between gap-4 pb-6">
        <div className="min-w-0">
          <h1 className="text-balance text-[24px] font-semibold leading-tight tracking-[-0.02em] lg:text-[28px]">{order.title}</h1>
          <p className="mt-1 text-[14.5px] text-ink-2">
            Pedido {order.number}
            {order.stage ? `, ${order.stage.name}` : ""}. Lo pidió {order.createdBy.user.name.split(" ")[0]} el {dateLabel(order.createdAt, { day: "numeric", month: "short" })}.
          </p>
        </div>
        <DeadlineBadge neededBy={order.neededBy} status={order.status} size="lg" />
      </header>
      <div className="mb-8 max-w-xl">
        <StatusSteps status={order.status} />
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0">
          <SectionTitle>Lo que se pidió</SectionTitle>
          <Card>
            <ol className="divide-y divide-line">
              {order.lines.map((l, i) => (
                <li key={l.id} className="flex items-baseline gap-3 px-4 py-3">
                  <span className="font-figure w-5 shrink-0 text-right text-[13px] font-semibold text-ink-3">{i + 1}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{l.material}</span>
                    {l.quality && <span className="block text-[13.5px] text-ink-2">Marca o calidad: {l.quality}</span>}
                  </span>
                  <span className="tnum shrink-0 text-[15px] font-semibold">
                    {l.quantity} <span className="font-normal text-ink-2">{l.unit}</span>
                  </span>
                </li>
              ))}
            </ol>
          </Card>
          {order.notes && <p className="mt-3 rounded-control bg-sunken px-4 py-3 text-[14.5px] text-ink-2">{order.notes}</p>}
        </div>

        <aside className="space-y-4">
          {order.attachments.length > 0 && (
            <Card className="p-4">
              <p className="mb-2 text-[14px] font-semibold">Lista original</p>
              <div className="flex flex-wrap gap-2">
                {order.attachments.map((a) => (
                  <a key={a.id} href={`/api/adjuntos/${a.id}`} target="_blank" rel="noreferrer" aria-label={`Abrir ${a.filename}`}>
                    {a.mime.startsWith("image/") ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={`/api/adjuntos/${a.id}`} alt="" className="h-24 w-20 rounded-control border border-line object-cover" />
                    ) : (
                      <span className="grid h-24 w-20 place-items-center rounded-control border border-line bg-sunken text-[12px] font-semibold text-ink-2">
                        <FileText className="size-6" aria-hidden />
                      </span>
                    )}
                  </a>
                ))}
              </div>
            </Card>
          )}
          {open && (
            <Card className="p-4">
              <p className="mb-3 text-[14px] font-semibold">¿Cambió la fecha?</p>
              <ActionForm action={updateNeededBy.bind(null, projectId, order.id)} submitLabel="Cambiar fecha" variant="secondary" resetOnOk={false}>
                <Input name="neededBy" type="date" defaultValue={dateKey(order.neededBy)} aria-label="Fecha en que se necesita" required />
              </ActionForm>
            </Card>
          )}
        </aside>
      </div>

      {(money || order.quotes.length > 0) && order.status !== "CANCELADO" && (
        <section className="mt-10">
          <SectionTitle>
            Cotizaciones
            {order.quotes.length > 0 && <span className="ml-2 text-[15px] font-normal text-ink-3">{order.quotes.length}</span>}
          </SectionTitle>
          {order.quotes.length > 0 && (
            <ComparisonView
              projectId={projectId}
              orderId={order.id}
              lines={cmpLines}
              quotes={cmpQuotes}
              cmp={cmp}
              canChoose={money && open}
              canEdit={money && open}
              suppliers={suppliers.map((s) => s.name)}
              today={today}
              aiEnabled={aiAvailable()}
              choose={chooseLines.bind(null, projectId, order.id)}
              saveQuote={saveQuote.bind(null, projectId, order.id)}
              deleteQuote={deleteQuote.bind(null, projectId, order.id)}
            />
          )}
          {money && open && (
            <div className="mt-4">
              {order.quotes.length === 0 && <p className="mb-3 text-[14.5px] text-ink-2">Agregue las cotizaciones que lleguen; se comparan solas, material por material.</p>}
              <QuoteEditor
                projectId={projectId}
                orderId={order.id}
                lines={cmpLines}
                suppliers={suppliers.map((s) => s.name)}
                today={today}
                aiEnabled={aiAvailable()}
                save={saveQuote.bind(null, projectId, order.id)}
              />
            </div>
          )}
        </section>
      )}

      {money && open && (
        <section className="mt-10" id="proveedores">
          <SectionTitle>Proveedores para cotizar</SectionTitle>
          <SupplierFinder
            message={quoteMessage}
            known={suppliers.map((s) => ({ name: s.name, phone: s.phone }))}
            saved={(order.supplierSearch as SupplierSearch | null) ?? null}
            searchedAt={order.supplierSearchAt ? dateLabel(order.supplierSearchAt, { day: "numeric", month: "short" }) : null}
            aiEnabled={aiAvailable()}
            hasLocation={Boolean(member.project.location?.trim())}
            settingsHref={`/p/${projectId}/ajustes`}
            find={findSuppliers.bind(null, projectId, order.id)}
            save={saveSupplier.bind(null, projectId)}
          />
        </section>
      )}

      {money && open && chosen > 0 && (
        <section className="mt-10" id="comprar">
          <SectionTitle>Registrar la compra</SectionTitle>
          <Card className="p-4 sm:p-5">
            <p className="mb-4 text-[14.5px] text-ink-2">
              Se crea un gasto por proveedor con los {chosen === order.lines.length ? "" : `${chosen} `}materiales elegidos y su transporte.
              {chosen < order.lines.length && <span className="font-semibold text-warn"> Quedan {order.lines.length - chosen} materiales sin elegir; no se compran.</span>}
            </p>
            <ActionForm action={buyOrder.bind(null, projectId, order.id)} submitLabel="Registrar compra" pendingLabel="Registrando…" resetOnOk={false}>
              <PayerRadios partners={partners.map((p) => ({ id: p.id, name: p.user.name, color: p.color }))} defaultValue={member.role === "SOCIO" ? `socio:${member.id}` : undefined} />
              <label className="flex min-h-12 cursor-pointer items-center gap-2.5 rounded-control border border-line-strong bg-surface px-3 text-[14.5px] font-semibold has-[:checked]:border-ink has-[:checked]:ring-2 has-[:checked]:ring-ink/80 sm:w-fit">
                <input type="radio" name="payer" value="pendiente" className="sr-only" />
                <span aria-hidden className="size-9 shrink-0 rounded-full border-2 border-dashed border-ink-3" />
                Queda por pagar (crédito)
              </label>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Etapa" htmlFor="bstage">
                  <Select id="bstage" name="stageId" defaultValue={order.stageId ?? ""} required>
                    <option value="" disabled>
                      Elija la etapa
                    </option>
                    {stages.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Fecha de compra" htmlFor="bdate">
                  <Input id="bdate" name="date" type="date" defaultValue={today} max={today} />
                </Field>
                <Field label="Vence el" htmlFor="bdue" hint="Solo si queda por pagar">
                  <Input id="bdue" name="dueDate" type="date" />
                </Field>
              </div>
            </ActionForm>
          </Card>
        </section>
      )}

      {(order.status === "COMPRADO" || order.status === "RECIBIDO") && (
        <section className="mt-10">
          <SectionTitle>{money ? "Compra" : "Se le compró a"}</SectionTitle>
          <Card>
            <ul className="divide-y divide-line">
              {order.expenses.map((e) => {
                const pending = e.total - e.payments.reduce((s, p) => s + p.amount, 0);
                const inner = (
                  <>
                    <ReceiptText className="size-5 shrink-0 text-ink-3" aria-hidden />
                    <span className="min-w-0 flex-1 font-semibold">{e.supplier}</span>
                    {money ? (
                      <span className="text-right">
                        <span className="tnum block font-semibold">{crc(e.total)}</span>
                        {pending > 0 && <span className="tnum block text-[13px] font-semibold text-warn">Debe {crc(pending)}</span>}
                      </span>
                    ) : (
                      <span className="text-[13.5px] text-ink-3">{order.boughtAt ? `Comprado el ${dateLabel(order.boughtAt, { day: "numeric", month: "short" })}` : "Comprado"}</span>
                    )}
                  </>
                );
                return (
                  <li key={e.id}>
                    {money ? (
                      <Link href={`/p/${projectId}/gastos/${e.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-sunken/60">
                        {inner}
                      </Link>
                    ) : (
                      <div className="flex items-center gap-3 px-4 py-3">{inner}</div>
                    )}
                  </li>
                );
              })}
            </ul>
            {money && order.expenses.length > 1 && (
              <p className="border-t border-line px-4 py-3 text-[14.5px] text-ink-2">
                Total: <span className="tnum font-semibold text-ink">{crc(spent)}</span>
              </p>
            )}
          </Card>
          {money && order.status === "COMPRADO" && <p className="mt-2 text-[13.5px] text-ink-3">Cuando llegue la factura, súbala en cada gasto como respaldo.</p>}

          {order.status === "COMPRADO" ? (
            <Card className="mt-4 p-4 sm:p-5">
              <h3 className="mb-1 flex items-center gap-2 text-[16px] font-semibold">
                <PackageCheck className="size-5 text-ink-2" aria-hidden /> ¿Ya llegó a la obra?
              </h3>
              <p className="mb-4 text-[14px] text-ink-2">Márquelo cuando reciba el material. Si faltó algo, anótelo.</p>
              <ActionForm action={receiveOrder.bind(null, projectId, order.id)} submitLabel="Marcar como recibido" resetOnOk={false}>
                <Field label="Faltantes o problemas" htmlFor="rnote" hint="Opcional. Ej.: faltaron 5 sacos de cemento">
                  <Textarea id="rnote" name="note" maxLength={500} />
                </Field>
              </ActionForm>
            </Card>
          ) : (
            <div className="mt-4">
              <Notice tone={order.receivedNote ? "warn" : "ok"}>
                Recibido en obra el {dateLabel(order.receivedAt!, { day: "numeric", month: "long" })}.{order.receivedNote ? ` Faltantes: ${order.receivedNote}` : " Llegó completo."}
              </Notice>
            </div>
          )}
        </section>
      )}

      {open && (money || order.createdById === member.id) && (
        <form action={cancelOrder.bind(null, projectId, order.id)} className="mt-12 border-t border-line pt-6">
          <Button variant="danger" type="submit">
            Cancelar pedido
          </Button>
          <p className="mt-2 text-[13px] text-ink-3">Si ya no hace falta. Las cotizaciones quedan guardadas.</p>
        </form>
      )}
    </div>
  );
}
