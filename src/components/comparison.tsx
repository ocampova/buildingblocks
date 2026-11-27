"use client";

import { useMemo, useState, useTransition } from "react";
import { Check, LoaderCircle, PencilLine, Trash2, TriangleAlert } from "lucide-react";
import type { ActionState } from "./action-form";
import { Button, cx } from "./ui";
import { QuoteEditor, type QuoteInitial } from "./quote-editor";
import type { Comparison } from "@/lib/compare";

type Quality = "CUMPLE" | "DISTINTA" | "NO_CLARO";
export type CmpLine = { id: string; material: string; quantity: number; unit: string; quality: string | null; chosenId: string | null };
export type CmpQuoteView = {
  id: string;
  supplier: string;
  deliveryDays: number | null;
  transport: number | null;
  credit: string | null;
  attachmentIds: string[];
  lines: Record<string, { id: string; unitPrice: number; brand: string | null; quality: Quality; qualityNote: string | null }>;
  initial: QuoteInitial;
};

const crc = (n: number) => "₡" + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");

function QualityTag({ quality, note }: { quality: Quality; note: string | null }) {
  if (quality === "CUMPLE") return null;
  return (
    <span title={note ?? undefined} className={cx("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-semibold", quality === "DISTINTA" ? "bg-warn-soft text-warn" : "bg-sunken text-ink-2")}>
      {quality === "DISTINTA" && <TriangleAlert className="size-3" aria-hidden />}
      {quality === "DISTINTA" ? "Otra marca o calidad" : "Calidad sin confirmar"}
    </span>
  );
}

/**
 * Cotizaciones lado a lado. Cada material se elige con un toque; la elección se guarda sola.
 * El mejor precio que respeta la calidad pedida se marca en cada fila.
 */
export function ComparisonView({
  projectId,
  orderId,
  lines,
  quotes,
  cmp,
  canChoose,
  canEdit,
  suppliers,
  today,
  aiEnabled,
  choose,
  saveQuote,
  deleteQuote,
}: {
  projectId: string;
  orderId: string;
  lines: CmpLine[];
  quotes: CmpQuoteView[];
  cmp: Comparison;
  canChoose: boolean;
  canEdit: boolean;
  suppliers: string[];
  today: string;
  aiEnabled: boolean;
  choose: (choices: Record<string, string | null>) => Promise<ActionState>;
  saveQuote: (quoteId: string | null, raw: unknown) => Promise<ActionState>;
  deleteQuote: (quoteId: string) => Promise<void>;
}) {
  const [choices, setChoices] = useState<Record<string, string | null>>(() => Object.fromEntries(lines.map((l) => [l.id, l.chosenId])));
  const [saving, start] = useTransition();
  const [saved, setSaved] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);

  const quoteOfLine = useMemo(() => {
    const m = new Map<string, string>();
    for (const q of quotes) for (const ql of Object.values(q.lines)) m.set(ql.id, q.id);
    return m;
  }, [quotes]);

  function apply(next: Record<string, string | null>) {
    setChoices(next);
    setSaved(false);
    start(async () => {
      const r = await choose(next);
      if (!r.error) setSaved(true);
    });
  }
  const pick = (lineId: string, quoteLineId: string) => apply({ ...choices, [lineId]: choices[lineId] === quoteLineId ? null : quoteLineId });
  const cheapest = () => apply(Object.fromEntries(lines.map((l) => [l.id, cmp.bestMix.picks.find((p) => p.orderLineId === l.id)?.quoteLineId ?? null])));
  const allTo = (quoteId: string) => apply(Object.fromEntries(lines.map((l) => [l.id, quotes.find((q) => q.id === quoteId)!.lines[l.id]?.id ?? null])));

  // Resumen de lo elegido, por proveedor
  const chosenBySupplier = new Map<string, number>();
  for (const l of lines) {
    const c = choices[l.id];
    if (!c) continue;
    const qid = quoteOfLine.get(c)!;
    const ql = quotes.find((q) => q.id === qid)!.lines[l.id];
    chosenBySupplier.set(qid, (chosenBySupplier.get(qid) ?? 0) + ql.unitPrice * l.quantity);
  }
  const chosenTotal = [...chosenBySupplier.entries()].reduce((s, [qid, v]) => s + v + (quotes.find((q) => q.id === qid)!.transport ?? 0), 0);
  const chosenCount = lines.filter((l) => choices[l.id]).length;
  const summary = (qid: string) => cmp.quotes.find((s) => s.quoteId === qid)!;
  const best = (lineId: string) => cmp.lines.find((l) => l.orderLineId === lineId)!;

  return (
    <div className="space-y-4">
      {canChoose && quotes.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="secondary" onClick={cheapest}>
            Lo más barato por material
            <span className="tnum text-ink-2">{crc(cmp.bestMix.total)}</span>
          </Button>
          {cmp.bestSingle && quotes.length > 1 && (
            <Button type="button" variant="secondary" onClick={() => allTo(cmp.bestSingle!.quoteId)}>
              Todo a {quotes.find((q) => q.id === cmp.bestSingle!.quoteId)!.supplier}
              <span className="tnum text-ink-2">{crc(cmp.bestSingle.total)}</span>
            </Button>
          )}
          <span className="ml-auto flex min-h-6 items-center gap-1.5 text-[13.5px] text-ink-3" aria-live="polite">
            {saving ? (
              <>
                <LoaderCircle className="size-3.5 animate-spin" aria-hidden /> Guardando
              </>
            ) : saved ? (
              <>
                <Check className="size-3.5" aria-hidden /> Elección guardada
              </>
            ) : null}
          </span>
        </div>
      )}

      {/* Computadora: tabla materiales × proveedores */}
      <div className="hidden overflow-x-auto rounded-card border border-line bg-surface md:block">
        <table className="w-full min-w-[640px] border-collapse text-[14.5px]">
          <caption className="sr-only">Cotizaciones por material</caption>
          <thead>
            <tr className="border-b border-line align-bottom">
              <th scope="col" className="w-[30%] px-4 py-3 text-left text-[13px] font-semibold text-ink-3">
                Material
              </th>
              {quotes.map((q) => {
                const s = summary(q.id);
                return (
                  <th key={q.id} scope="col" className="px-4 py-3 text-left font-normal">
                    <span className="block text-[15px] font-semibold text-ink">{q.supplier}</span>
                    <span className="block text-[12.5px] text-ink-3">
                      {q.deliveryDays !== null ? (q.deliveryDays === 0 ? "Entrega hoy" : `Entrega en ${q.deliveryDays} ${q.deliveryDays === 1 ? "día" : "días"}`) : "Entrega sin indicar"}
                      {q.credit ? ` · ${q.credit}` : ""}
                    </span>
                    {s.missing > 0 && <span className="mt-1 inline-block rounded-full bg-sunken px-2 py-0.5 text-[12px] font-semibold text-ink-2">Le faltan {s.missing}</span>}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {lines.map((l) => {
              const b = best(l.id);
              return (
                <tr key={l.id} className="align-top">
                  <th scope="row" className="px-4 py-3 text-left font-normal">
                    <span className="block font-semibold">{l.material}</span>
                    <span className="tnum block text-[13px] text-ink-2">
                      {l.quantity} {l.unit}
                      {l.quality ? ` · pidió ${l.quality}` : ""}
                    </span>
                    {b.uncovered && <span className="mt-1 inline-block text-[12.5px] font-semibold text-danger">Nadie lo cotizó</span>}
                  </th>
                  {quotes.map((q) => {
                    const ql = q.lines[l.id];
                    if (!ql) return <td key={q.id} className="px-4 py-3 text-[13.5px] text-ink-3">No lo trae</td>;
                    const isBest = b.bestQuoteId === q.id && quotes.length > 1;
                    const isChosen = choices[l.id] === ql.id;
                    const Tag = canChoose ? "button" : "div";
                    return (
                      <td key={q.id} className="p-1.5">
                        <Tag
                          {...(canChoose ? { type: "button" as const, onClick: () => pick(l.id, ql.id), "aria-pressed": isChosen } : {})}
                          className={cx(
                            "block w-full rounded-control border px-3 py-2 text-left transition-[border-color,background-color] duration-150",
                            isChosen ? "border-brand bg-brand-soft ring-2 ring-brand" : isBest ? "border-ok/40 bg-ok-soft/60" : "border-transparent",
                            canChoose && !isChosen && "hover:border-line-strong",
                          )}
                        >
                          <span className="flex items-baseline justify-between gap-2">
                            <span className="tnum text-[16px] font-semibold">{crc(ql.unitPrice * l.quantity)}</span>
                            {isChosen ? <Check className="size-4 shrink-0 text-brand" aria-label="Elegido" /> : isBest ? <span className="text-[11.5px] font-semibold text-ok">Mejor precio</span> : null}
                          </span>
                          <span className="tnum block text-[12.5px] text-ink-3">
                            {crc(ql.unitPrice)} c/u{ql.brand ? ` · ${ql.brand}` : ""}
                          </span>
                          <QualityTag quality={ql.quality} note={ql.qualityNote} />
                        </Tag>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t border-line-strong bg-sunken/50 align-top">
              <th scope="row" className="px-4 py-3 text-left text-[13.5px] font-semibold">
                Total con transporte
              </th>
              {quotes.map((q) => {
                const s = summary(q.id);
                return (
                  <td key={q.id} className="px-4 py-3">
                    <span className="font-figure block text-[18px] font-semibold">{crc(s.total)}</span>
                    <span className="block text-[12.5px] text-ink-3">{q.transport === null ? "Transporte sin indicar" : q.transport === 0 ? "Transporte gratis" : `Incluye ${crc(q.transport)} de transporte`}</span>
                  </td>
                );
              })}
            </tr>
            {canEdit && (
              <tr>
                <td />
                {quotes.map((q) => (
                  <td key={q.id} className="px-3 pb-3">
                    <QuoteActions q={q} onEdit={() => setEditing(q.id)} onDelete={() => deleteQuote(q.id)} />
                  </td>
                ))}
              </tr>
            )}
          </tfoot>
        </table>
      </div>

      {/* Celular: una tarjeta por material, opciones de la más barata a la más cara */}
      <ol className="space-y-3 md:hidden">
        {lines.map((l) => {
          const b = best(l.id);
          const options = quotes
            .filter((q) => q.lines[l.id])
            .map((q) => ({ q, ql: q.lines[l.id] }))
            .sort((a, z) => a.ql.unitPrice - z.ql.unitPrice);
          return (
            <li key={l.id} className="rounded-card border border-line bg-surface">
              <div className="border-b border-line px-4 py-3">
                <p className="font-semibold">{l.material}</p>
                <p className="tnum text-[13px] text-ink-2">
                  {l.quantity} {l.unit}
                  {l.quality ? ` · pidió ${l.quality}` : ""}
                </p>
              </div>
              {options.length === 0 ? (
                <p className="px-4 py-3 text-[14px] font-semibold text-danger">Nadie lo cotizó todavía</p>
              ) : (
                <ul className="divide-y divide-line">
                  {options.map(({ q, ql }) => {
                    const isBest = b.bestQuoteId === q.id && quotes.length > 1;
                    const isChosen = choices[l.id] === ql.id;
                    const Tag = canChoose ? "button" : "div";
                    return (
                      <li key={q.id}>
                        <Tag
                          {...(canChoose ? { type: "button" as const, onClick: () => pick(l.id, ql.id), "aria-pressed": isChosen } : {})}
                          className={cx("flex w-full items-center gap-3 px-4 py-3 text-left", isChosen && "bg-brand-soft")}
                        >
                          {canChoose && (
                            <span aria-hidden className={cx("grid size-6 shrink-0 place-items-center rounded-full border-2", isChosen ? "border-brand bg-brand text-white" : "border-line-strong")}>
                              {isChosen && <Check className="size-3.5" strokeWidth={3} />}
                            </span>
                          )}
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[15px] font-semibold">{q.supplier}</span>
                            <span className="tnum block text-[12.5px] text-ink-3">
                              {crc(ql.unitPrice)} c/u{ql.brand ? ` · ${ql.brand}` : ""}
                            </span>
                            <QualityTag quality={ql.quality} note={ql.qualityNote} />
                          </span>
                          <span className="shrink-0 text-right">
                            <span className="tnum block text-[15.5px] font-semibold">{crc(ql.unitPrice * l.quantity)}</span>
                            {isBest && <span className="text-[11.5px] font-semibold text-ok">Mejor precio</span>}
                          </span>
                        </Tag>
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          );
        })}
      </ol>
      <ul className="space-y-2 md:hidden">
        {quotes.map((q) => {
          const s = summary(q.id);
          return (
            <li key={q.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-card border border-line bg-surface px-4 py-3">
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{q.supplier}</span>
                <span className="block text-[12.5px] text-ink-3">
                  {s.missing > 0 ? `Le faltan ${s.missing} · ` : "Trae todo · "}
                  {q.transport === null ? "transporte sin indicar" : q.transport === 0 ? "transporte gratis" : `transporte ${crc(q.transport)}`}
                  {q.deliveryDays !== null ? ` · entrega en ${q.deliveryDays} d` : ""}
                </span>
              </span>
              <span className="font-figure text-[17px] font-semibold">{crc(s.total)}</span>
              {canEdit && (
                <span className="w-full">
                  <QuoteActions q={q} onEdit={() => setEditing(q.id)} onDelete={() => deleteQuote(q.id)} />
                </span>
              )}
            </li>
          );
        })}
      </ul>

      {editing && (
        <QuoteEditor
          key={editing}
          projectId={projectId}
          orderId={orderId}
          lines={lines}
          suppliers={suppliers}
          today={today}
          aiEnabled={aiEnabled}
          initial={quotes.find((q) => q.id === editing)!.initial}
          save={saveQuote}
          onDone={() => setEditing(null)}
        />
      )}

      {canChoose && chosenCount > 0 && (
        <div className="rounded-card border border-brand/20 bg-brand-soft/60 px-4 py-3.5 sm:px-5">
          <p className="text-[14.5px] text-ink-2">
            Elegido: <span className="font-semibold text-ink">{chosenCount} de {lines.length} materiales</span>
            {chosenBySupplier.size > 0 && ` a ${chosenBySupplier.size} ${chosenBySupplier.size === 1 ? "proveedor" : "proveedores"}`}, por{" "}
            <span className="font-figure text-[17px] font-semibold text-ink">{crc(chosenTotal)}</span> con transporte.
          </p>
        </div>
      )}
    </div>
  );
}

function QuoteActions({ q, onEdit, onDelete }: { q: CmpQuoteView; onEdit: () => void; onDelete: () => void }) {
  return (
    <span className="flex flex-wrap items-center gap-1">
      {q.attachmentIds.map((id, i) => (
        <a key={id} href={`/api/adjuntos/${id}`} target="_blank" rel="noreferrer" className="inline-flex min-h-9 items-center rounded-control px-2 text-[13px] font-semibold text-brand hover:bg-brand-soft">
          Ver cotización{q.attachmentIds.length > 1 ? ` ${i + 1}` : ""}
        </a>
      ))}
      <button type="button" onClick={onEdit} className="inline-flex min-h-9 items-center gap-1 rounded-control px-2 text-[13px] font-semibold text-ink-2 hover:bg-sunken">
        <PencilLine className="size-3.5" aria-hidden /> Corregir
      </button>
      <button
        type="button"
        onClick={() => {
          if (confirm(`¿Borrar la cotización de ${q.supplier}?`)) onDelete();
        }}
        aria-label={`Borrar la cotización de ${q.supplier}`}
        className="grid size-9 place-items-center rounded-control text-ink-3 hover:bg-danger-soft hover:text-danger"
      >
        <Trash2 className="size-3.5" aria-hidden />
      </button>
    </span>
  );
}
