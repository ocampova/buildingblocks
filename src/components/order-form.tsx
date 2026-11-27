"use client";

import { useActionState, useRef, useState } from "react";
import { Camera, LoaderCircle, Plus, Sparkles, Trash2, TriangleAlert } from "lucide-react";
import type { ActionState } from "./action-form";
import { Button, cx, Field, Input, inputClass, Textarea } from "./ui";
import { compressImage } from "./upload";
import type { ListRead } from "@/app/api/p/[projectId]/pedidos/leer-lista/route";

type Row = { key: number; material: string; quantity: string; unit: string; quality: string };
const UNITS = ["unidad", "saco", "metro", "m²", "m³", "kg", "galón", "rollo", "lámina", "caja", "varilla", "viaje"];
let seq = 0;
const empty = (): Row => ({ key: ++seq, material: "", quantity: "", unit: "", quality: "" });

export function OrderForm({
  projectId,
  stages,
  today,
  aiEnabled,
  action,
}: {
  projectId: string;
  stages: { id: string; name: string }[];
  today: string;
  aiEnabled: boolean;
  action: (prev: ActionState, form: FormData) => Promise<ActionState>;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, {});
  const [rows, setRows] = useState<Row[]>([empty(), empty(), empty()]);
  const [stageId, setStageId] = useState("");
  const [reading, setReading] = useState(false);
  const [readNote, setReadNote] = useState<{ tone: "ok" | "warn"; text: string }>();
  const [attachmentIds, setAttachmentIds] = useState<string[]>([]);
  const camRef = useRef<HTMLInputElement>(null);

  const set = (key: number, patch: Partial<Row>) => setRows((r) => r.map((x) => (x.key === key ? { ...x, ...patch } : x)));
  const filled = rows.filter((r) => r.material.trim());
  const valid = filled.filter((r) => Number(r.quantity.replace(",", ".")) > 0 && r.unit.trim());
  const payload = JSON.stringify(valid.map((r) => ({ material: r.material.trim(), quantity: Number(r.quantity.replace(",", ".")), unit: r.unit.trim(), quality: r.quality.trim() || null })));

  async function readList(file: File | undefined) {
    if (!file) return;
    setReading(true);
    setReadNote(undefined);
    try {
      const body = new FormData();
      body.set("file", await compressImage(file));
      const res = await fetch(`/api/p/${projectId}/pedidos/leer-lista`, { method: "POST", body });
      const json = (await res.json()) as ListRead & { error?: string };
      if (!res.ok) throw new Error(json.error ?? "No se pudo subir la foto.");
      setAttachmentIds((a) => [...a, json.attachmentId]);
      if (json.read === "ia") {
        const read = json.lines.map((l) => ({ key: ++seq, material: l.material, quantity: l.quantity ? String(l.quantity) : "", unit: l.unit ?? "", quality: l.quality ?? "" }));
        setRows((r) => [...r.filter((x) => x.material.trim()), ...read, empty()]);
        setReadNote({ tone: "ok", text: `Se leyeron ${read.length} materiales. Revise cantidades y unidades.` });
      } else {
        setReadNote({ tone: "warn", text: json.read === "unavailable" ? "La foto quedó guardada con el pedido. Escriba los materiales abajo." : "No se pudo leer la lista. Quedó guardada con el pedido; escriba los materiales abajo." });
      }
    } catch (e) {
      setReadNote({ tone: "warn", text: e instanceof Error ? e.message : "No se pudo subir la foto." });
    } finally {
      setReading(false);
      if (camRef.current) camRef.current.value = "";
    }
  }

  return (
    <form action={formAction} className="space-y-7">
      <input type="hidden" name="lines" value={payload} />
      <input type="hidden" name="stageId" value={stageId} />
      <input type="hidden" name="attachmentIds" value={attachmentIds.join(",")} />

      <div className="grid gap-4 sm:grid-cols-[1fr_220px]">
        <Field label="¿Para qué es?" htmlFor="title" hint="Ej.: Columnas del primer piso">
          <Input id="title" name="title" required maxLength={160} />
        </Field>
        <Field label="¿Para cuándo lo necesita?" htmlFor="neededBy">
          <Input id="neededBy" name="neededBy" type="date" min={today} required />
        </Field>
      </div>

      <fieldset>
        <legend className="mb-2 text-[14px] font-semibold">Etapa <span className="font-normal text-ink-3">(opcional)</span></legend>
        <div className="flex flex-wrap gap-2">
          {stages.map((s) => (
            <button
              key={s.id}
              type="button"
              aria-pressed={stageId === s.id}
              onClick={() => setStageId(stageId === s.id ? "" : s.id)}
              className={cx("min-h-11 rounded-full border px-4 text-[14.5px] font-medium", stageId === s.id ? "border-brand bg-brand text-white" : "border-line-strong bg-surface hover:border-ink-3")}
            >
              {s.name}
            </button>
          ))}
        </div>
      </fieldset>

      <section aria-labelledby="materiales">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 id="materiales" className="text-[17px] font-semibold">Materiales</h2>
          <input ref={camRef} type="file" accept="image/*,application/pdf" className="sr-only" onChange={(e) => readList(e.target.files?.[0])} />
          <Button type="button" variant="secondary" onClick={() => camRef.current?.click()} disabled={reading}>
            {reading ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <Camera className="size-4" aria-hidden />}
            {reading ? "Leyendo la lista…" : aiEnabled ? "Leer una lista en foto" : "Adjuntar foto de la lista"}
          </Button>
        </div>
        {readNote && (
          <p className={cx("mb-3 flex items-center gap-2 text-[14px] font-medium", readNote.tone === "ok" ? "text-brand" : "text-warn")}>
            {readNote.tone === "ok" ? <Sparkles className="size-4" aria-hidden /> : <TriangleAlert className="size-4" aria-hidden />}
            {readNote.text}
          </p>
        )}

        <datalist id="units">
          {UNITS.map((u) => (
            <option key={u} value={u} />
          ))}
        </datalist>
        <ol className="space-y-2.5">
          {rows.map((r, i) => (
            <li key={r.key} className="rounded-card border border-line bg-surface p-3 sm:p-3.5">
              <div className="flex items-start gap-2">
                <span className="font-figure mt-3 w-6 shrink-0 text-right text-[13px] font-semibold text-ink-3">{i + 1}</span>
                <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-[minmax(0,1fr)_90px_120px_minmax(0,180px)]">
                  <input aria-label={`Material ${i + 1}`} placeholder="Material, ej.: Cemento gris 50 kg" value={r.material} onChange={(e) => set(r.key, { material: e.target.value })} className={inputClass} />
                  <div className="grid grid-cols-[90px_1fr] gap-2 sm:contents">
                    <input aria-label={`Cantidad ${i + 1}`} placeholder="Cant." inputMode="decimal" value={r.quantity} onChange={(e) => set(r.key, { quantity: e.target.value.replace(/[^\d.,]/g, "") })} className={cx(inputClass, "tnum")} />
                    <input aria-label={`Unidad ${i + 1}`} placeholder="Unidad" list="units" value={r.unit} onChange={(e) => set(r.key, { unit: e.target.value })} className={inputClass} />
                  </div>
                  <input aria-label={`Marca o calidad ${i + 1}`} placeholder="Marca o calidad (opcional)" value={r.quality} onChange={(e) => set(r.key, { quality: e.target.value })} className={inputClass} />
                </div>
                <button
                  type="button"
                  aria-label={`Quitar material ${i + 1}`}
                  onClick={() => setRows((all) => (all.length > 1 ? all.filter((x) => x.key !== r.key) : [empty()]))}
                  className="mt-1 grid size-10 shrink-0 place-items-center rounded-full text-ink-3 hover:bg-danger-soft hover:text-danger"
                >
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </div>
              {r.material.trim() && !(Number(r.quantity.replace(",", ".")) > 0 && r.unit.trim()) && <p className="ml-8 mt-1.5 text-[13px] text-warn">Falta la cantidad o la unidad.</p>}
            </li>
          ))}
        </ol>
        <Button type="button" variant="ghost" className="mt-2" onClick={() => setRows((r) => [...r, empty()])}>
          <Plus className="size-4" aria-hidden /> Agregar material
        </Button>
      </section>

      <Field label="Notas para quien cotiza" htmlFor="notes" hint="Opcional. Ej.: entregar antes de las 7 a. m.">
        <Textarea id="notes" name="notes" maxLength={500} />
      </Field>

      {state.error && <p role="alert" className="rounded-control bg-danger-soft px-3.5 py-2.5 text-[14.5px] font-medium text-danger">{state.error}</p>}

      <div className="sticky bottom-0 z-10 -mx-4 border-t border-line bg-ground/95 px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 backdrop-blur lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:p-0">
        <Button type="submit" disabled={pending || reading || valid.length === 0} className="min-h-[52px] w-full text-[16px] lg:w-auto lg:px-8">
          {pending ? "Enviando…" : valid.length > 0 ? `Enviar pedido (${valid.length} ${valid.length === 1 ? "material" : "materiales"})` : "Enviar pedido"}
        </Button>
      </div>
    </form>
  );
}
