"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera, LoaderCircle, PencilLine, Sparkles, TriangleAlert } from "lucide-react";
import type { ActionState } from "./action-form";
import { Button, cx, Field, Input, inputClass, Select } from "./ui";
import { compressImage, groupDigits } from "./upload";
import type { QuoteRead } from "@/app/api/p/[projectId]/pedidos/[orderId]/cotizacion/route";

type Quality = "CUMPLE" | "DISTINTA" | "NO_CLARO";
type OrderLine = { id: string; material: string; quantity: number; unit: string; quality: string | null };
type LineState = { price: string; brand: string; quality: Quality; note: string };
export type QuoteInitial = {
  id: string;
  supplier: string;
  date: string;
  deliveryDays: number | null;
  transport: number | null;
  credit: string | null;
  notes: string | null;
  readByAi: boolean;
  lines: Record<string, { unitPrice: number; brand: string | null; quality: Quality; qualityNote: string | null }>;
};

const num = (s: string) => Number(s.replace(/\D/g, "")) || 0;
const fmt = (n: number) => "₡" + groupDigits(String(Math.round(n)));

/** Agregar o corregir una cotización. Se puede leer de una foto o PDF, o escribir a mano. */
export function QuoteEditor({
  projectId,
  orderId,
  lines,
  suppliers,
  today,
  aiEnabled,
  initial,
  save,
  onDone,
}: {
  projectId: string;
  orderId: string;
  lines: OrderLine[];
  suppliers: string[];
  today: string;
  aiEnabled: boolean;
  initial?: QuoteInitial;
  save: (quoteId: string | null, raw: unknown) => Promise<ActionState>;
  onDone?: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(Boolean(initial));
  const [reading, setReading] = useState(false);
  const [note, setNote] = useState<{ tone: "ai" | "warn"; text: string; extra?: string[] }>();
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  const [attachmentId, setAttachmentId] = useState<string | null>(null);
  const [readByAi, setReadByAi] = useState(initial?.readByAi ?? false);
  const [supplier, setSupplier] = useState(initial?.supplier ?? "");
  const [date, setDate] = useState(initial?.date ?? today);
  const [delivery, setDelivery] = useState(initial?.deliveryDays?.toString() ?? "");
  const [transport, setTransport] = useState(initial?.transport !== undefined && initial?.transport !== null ? groupDigits(String(initial.transport)) : "");
  const [credit, setCredit] = useState(initial?.credit ?? "");
  const [state, setState] = useState<Record<string, LineState>>(() =>
    Object.fromEntries(
      lines.map((l) => {
        const q = initial?.lines[l.id];
        return [l.id, { price: q ? groupDigits(String(q.unitPrice)) : "", brand: q?.brand ?? "", quality: q?.quality ?? "CUMPLE", note: q?.qualityNote ?? "" }];
      }),
    ),
  );
  const fileRef = useRef<HTMLInputElement>(null);
  const setLine = (id: string, patch: Partial<LineState>) => setState((s) => ({ ...s, [id]: { ...s[id], ...patch } }));

  async function read(file: File | undefined) {
    if (!file) return;
    setOpen(true);
    setReading(true);
    setNote(undefined);
    setError(undefined);
    try {
      const body = new FormData();
      body.set("file", await compressImage(file));
      const res = await fetch(`/api/p/${projectId}/pedidos/${orderId}/cotizacion`, { method: "POST", body });
      const json = (await res.json()) as QuoteRead & { error?: string };
      if (!res.ok) throw new Error(json.error ?? "No se pudo subir la cotización.");
      setAttachmentId(json.attachmentId);
      if (json.read === "ia") {
        setReadByAi(true);
        if (json.supplier) setSupplier((s) => s || json.supplier!);
        if (json.date) setDate(json.date);
        if (json.deliveryDays !== undefined) setDelivery(String(json.deliveryDays));
        if (json.transport !== undefined) setTransport(groupDigits(String(json.transport)));
        if (json.credit) setCredit(json.credit);
        setState((s) => {
          const next = { ...s };
          for (const [id, l] of Object.entries(json.lines)) {
            if (!next[id]) continue;
            next[id] = { price: l.unitPrice ? groupDigits(String(l.unitPrice)) : next[id].price, brand: l.brand ?? next[id].brand, quality: l.quality, note: l.qualityNote ?? "" };
          }
          return next;
        });
        const found = Object.keys(json.lines).length;
        setNote({ tone: "ai", text: `Se leyeron precios para ${found} de ${lines.length} materiales${json.currency === "USD" ? `, convertidos de dólares al tipo de cambio ${json.exchangeRate}` : ""}. Revise antes de guardar.`, extra: json.extra });
      } else {
        setNote({ tone: "warn", text: json.read === "unavailable" ? "La cotización quedó adjunta. Escriba los precios abajo." : "No se pudo leer la cotización. Quedó adjunta; escriba los precios abajo." });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo subir la cotización.");
    } finally {
      setReading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function submit() {
    setError(undefined);
    const raw = {
      supplier: supplier.trim(),
      date,
      deliveryDays: delivery.trim() ? Math.max(0, Math.round(Number(delivery))) : null,
      transport: transport.trim() ? num(transport) : null,
      credit: credit.trim() || null,
      notes: null,
      readByAi,
      attachmentId,
      lines: lines.map((l) => ({ orderLineId: l.id, unitPrice: num(state[l.id].price) || null, brand: state[l.id].brand.trim() || null, quality: state[l.id].quality, qualityNote: state[l.id].note.trim() || null })),
    };
    if (!raw.supplier) return setError("Escriba el nombre del proveedor.");
    start(async () => {
      const res = await save(initial?.id ?? null, raw);
      if (res.error) return setError(res.error);
      router.refresh();
      setOpen(false);
      setAttachmentId(null);
      setNote(undefined);
      if (!initial) {
        setSupplier("");
        setTransport("");
        setDelivery("");
        setCredit("");
        setState(Object.fromEntries(lines.map((l) => [l.id, { price: "", brand: "", quality: "CUMPLE" as Quality, note: "" }])));
      }
      onDone?.();
    });
  }

  const total = lines.reduce((s, l) => s + num(state[l.id].price) * l.quantity, 0) + num(transport);

  return (
    <div>
      <input ref={fileRef} type="file" accept="image/*,application/pdf" className="sr-only" onChange={(e) => read(e.target.files?.[0])} />
      {!initial && !open && (
        <div className="grid gap-2.5 sm:grid-cols-[1fr_auto]">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex min-h-[76px] items-center gap-4 rounded-card border border-brand/20 bg-brand-soft/70 px-5 text-left transition-colors hover:bg-brand-soft"
          >
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-brand text-white">
              <Camera className="size-5" aria-hidden />
            </span>
            <span>
              <span className="block text-[16px] font-semibold text-brand-strong">Agregar cotización</span>
              <span className="block text-[13.5px] text-ink-2">{aiEnabled ? "Foto, captura de WhatsApp o PDF: se leen los precios" : "Foto, captura de WhatsApp o PDF"}</span>
            </span>
          </button>
          <Button type="button" variant="secondary" className="min-h-[76px]" onClick={() => setOpen(true)}>
            <PencilLine className="size-4" aria-hidden /> Escribir a mano
          </Button>
        </div>
      )}

      {open && (
        <div className="space-y-5 rounded-card border border-line bg-surface p-4 sm:p-5">
          {reading && (
            <p className="flex items-center gap-2 text-[14.5px] font-medium text-brand">
              <LoaderCircle className="size-4 animate-spin" aria-hidden /> Leyendo la cotización…
            </p>
          )}
          {note && (
            <div className={cx("text-[14px] font-medium", note.tone === "ai" ? "text-brand" : "text-warn")}>
              <p className="flex items-center gap-2">
                {note.tone === "ai" ? <Sparkles className="size-4 shrink-0" aria-hidden /> : <TriangleAlert className="size-4 shrink-0" aria-hidden />}
                {note.text}
              </p>
              {note.extra && note.extra.length > 0 && <p className="mt-1 pl-6 text-[13px] font-normal text-ink-2">También cotizaron, fuera del pedido: {note.extra.join(", ")}.</p>}
            </div>
          )}

          <datalist id="suppliers">
            {suppliers.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr]">
            <Field label="Proveedor" htmlFor={`sup-${initial?.id ?? "new"}`}>
              <Input id={`sup-${initial?.id ?? "new"}`} list="suppliers" value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="Ferretería, depósito…" />
            </Field>
            <Field label="Fecha" htmlFor={`qd-${initial?.id ?? "new"}`}>
              <Input id={`qd-${initial?.id ?? "new"}`} type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} />
            </Field>
            <Field label="Entrega en (días)" htmlFor={`qe-${initial?.id ?? "new"}`}>
              <Input id={`qe-${initial?.id ?? "new"}`} inputMode="numeric" value={delivery} onChange={(e) => setDelivery(e.target.value.replace(/\D/g, ""))} placeholder="—" />
            </Field>
            <Field label="Transporte" htmlFor={`qt-${initial?.id ?? "new"}`} hint="0 si es gratis">
              <Input id={`qt-${initial?.id ?? "new"}`} inputMode="numeric" value={transport} onChange={(e) => setTransport(groupDigits(e.target.value))} placeholder="—" />
            </Field>
          </div>
          <Field label="Crédito o forma de pago" htmlFor={`qc-${initial?.id ?? "new"}`} hint="Opcional. Ej.: 30 días">
            <Input id={`qc-${initial?.id ?? "new"}`} value={credit} onChange={(e) => setCredit(e.target.value)} />
          </Field>

          <div>
            <p className="mb-2 text-[14px] font-semibold">Precio por unidad de cada material</p>
            <ul className="divide-y divide-line rounded-control border border-line">
              {lines.map((l, i) => {
                const s = state[l.id];
                const cost = num(s.price) * l.quantity;
                return (
                  <li key={l.id} className="space-y-2 p-3">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="min-w-0 text-[14.5px]">
                        <span className="font-figure mr-1.5 text-[12.5px] font-semibold text-ink-3">{i + 1}</span>
                        <span className="font-semibold">{l.material}</span>{" "}
                        <span className="tnum text-ink-2">
                          · {l.quantity} {l.unit}
                        </span>
                        {l.quality && <span className="block pl-5 text-[13px] text-ink-3">Pidió: {l.quality}</span>}
                      </p>
                      <p className="tnum shrink-0 text-[14px] font-semibold text-ink-2">{cost ? fmt(cost) : "—"}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pl-5 sm:grid-cols-[150px_1fr_190px]">
                      <div className="relative">
                        <span aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-semibold text-ink-3">₡</span>
                        <input
                          aria-label={`Precio por ${l.unit} de ${l.material}`}
                          inputMode="numeric"
                          value={s.price}
                          onChange={(e) => setLine(l.id, { price: groupDigits(e.target.value) })}
                          placeholder="No lo trae"
                          className={cx(inputClass, "tnum pl-7 font-semibold")}
                        />
                      </div>
                      <input aria-label={`Marca de ${l.material}`} value={s.brand} onChange={(e) => setLine(l.id, { brand: e.target.value })} placeholder="Marca" className={inputClass} />
                      <Select aria-label={`¿Cumple la calidad pedida? ${l.material}`} value={s.quality} onChange={(e) => setLine(l.id, { quality: e.target.value as Quality })} className="col-span-2 sm:col-span-1">
                        <option value="CUMPLE">Cumple lo pedido</option>
                        <option value="DISTINTA">Otra marca o calidad</option>
                        <option value="NO_CLARO">No está claro</option>
                      </Select>
                    </div>
                    {s.quality !== "CUMPLE" && (
                      <input
                        aria-label={`Por qué no cumple: ${l.material}`}
                        value={s.note}
                        onChange={(e) => setLine(l.id, { note: e.target.value })}
                        placeholder="¿Qué cambia? Ej.: cotiza grado 60, se pidió grado 40"
                        className={cx(inputClass, "ml-5 w-[calc(100%-1.25rem)] text-[14.5px]")}
                      />
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          {error && <p role="alert" className="rounded-control bg-danger-soft px-3.5 py-2.5 text-[14px] font-medium text-danger">{error}</p>}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[14.5px] text-ink-2">
              Total con transporte: <span className="font-figure text-[18px] font-semibold text-ink">{fmt(total)}</span>
            </p>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={() => (initial ? onDone?.() : setOpen(false))}>
                Cancelar
              </Button>
              <Button type="button" onClick={submit} disabled={pending || reading}>
                {pending ? "Guardando…" : initial ? "Guardar cambios" : "Guardar cotización"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
