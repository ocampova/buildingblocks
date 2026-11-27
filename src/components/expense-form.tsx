"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Camera, FileText, LoaderCircle, Sparkles, TriangleAlert, X } from "lucide-react";
import type { ActionState } from "./action-form";
import { Button, cx, Field, inputClass, Input, noteBg, noteSoft, PayerChip } from "./ui";
import { groupDigits, uploadReceipt } from "./upload";
import type { Prefill, UploadResult } from "@/app/api/p/[projectId]/adjuntos/route";

type Partner = { id: string; name: string; color: number };
type Stage = { id: string; name: string };
type Uploaded = { id: string; name: string; preview?: string; read: UploadResult["read"]; isPdf: boolean; isXml: boolean };

const RECEIPT_LABEL = { FACTURA: "Factura", TIQUETE: "Tiquete o recibo", NOTA: "Nota a mano", COMPROBANTE: "Comprobante de pago", NINGUNO: "Sin respaldo" } as const;

export function ExpenseForm({
  projectId,
  partners,
  stages,
  defaultPayer,
  today,
  aiEnabled,
  action,
}: {
  projectId: string;
  partners: Partner[];
  stages: Stage[];
  defaultPayer?: string;
  today: string;
  aiEnabled: boolean;
  action: (prev: ActionState, form: FormData) => Promise<ActionState>;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, {});
  const [files, setFiles] = useState<Uploaded[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string>();
  const [duplicate, setDuplicate] = useState<UploadResult["duplicate"]>();
  const [prefill, setPrefill] = useState<Prefill>({});
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [supplier, setSupplier] = useState("");
  const [date, setDate] = useState(today);
  const [payer, setPayer] = useState(defaultPayer ?? "");
  const [stageId, setStageId] = useState("");
  const [receiptType, setReceiptType] = useState<keyof typeof RECEIPT_LABEL>("NINGUNO");
  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Recuerda la última etapa usada en este teléfono
  useEffect(() => {
    try {
      const last = localStorage.getItem(`obra:stage:${projectId}`);
      if (last && stages.some((s) => s.id === last)) setStageId(last);
    } catch {}
  }, [projectId, stages]);

  async function onFiles(list: FileList | null) {
    if (!list?.length) return;
    setUploadError(undefined);
    setUploading(true);
    try {
      for (const file of Array.from(list)) {
        const res = await uploadReceipt(projectId, file);
        const isPdf = file.type === "application/pdf";
        const isXml = /xml/.test(file.type) || /\.xml$/i.test(file.name);
        setFiles((f) => [...f, { id: res.attachmentId, name: file.name, read: res.read, isPdf, isXml, preview: !isPdf && !isXml ? URL.createObjectURL(file) : undefined }]);
        if (res.duplicate) setDuplicate(res.duplicate);
        const p = res.prefill;
        if (Object.keys(p).length) {
          setPrefill((old) => ({ ...old, ...p }));
          // Lo leído llena solo lo que la persona no ha escrito
          if (p.total) setAmount((a) => a || groupDigits(String(p.total)));
          if (p.description) setDescription((d) => d || p.description!);
          if (p.supplier) setSupplier((s) => s || p.supplier!);
          if (p.date) setDate((d) => (d === today ? p.date! : d));
          if (p.receiptType) setReceiptType(p.receiptType);
        } else {
          setReceiptType((r) => (r === "NINGUNO" ? (isPdf ? "FACTURA" : "TIQUETE") : r));
        }
      }
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "No se pudo subir el archivo.");
    } finally {
      setUploading(false);
      if (cameraRef.current) cameraRef.current.value = "";
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const readInfo = files.find((f) => f.read === "xml") ? "xml" : files.find((f) => f.read === "ia") ? "ia" : files.length ? files[files.length - 1].read : null;
  const payerOptions = [
    ...partners.map((p) => ({ value: `socio:${p.id}`, label: p.name.split(" ")[0], color: p.color as number | "caja", chip: p.name })),
    { value: "caja", label: "Caja chica", color: "caja" as const, chip: "Caja" },
  ];

  return (
    <form
      action={(fd) => {
        try {
          if (stageId) localStorage.setItem(`obra:stage:${projectId}`, stageId);
        } catch {}
        formAction(fd);
      }}
      className="space-y-7"
    >
      <input type="hidden" name="attachmentIds" value={files.map((f) => f.id).join(",")} />
      <input type="hidden" name="receiptType" value={files.length || receiptType !== "NINGUNO" ? receiptType : "NINGUNO"} />
      <input type="hidden" name="haciendaKey" value={prefill.haciendaKey ?? ""} />
      <input type="hidden" name="currency" value={prefill.currency ?? "CRC"} />
      <input type="hidden" name="originalTotal" value={prefill.originalTotal ?? ""} />
      <input type="hidden" name="exchangeRate" value={prefill.exchangeRate ?? ""} />
      <input type="hidden" name="lines" value={JSON.stringify(prefill.lines ?? [])} />
      <input type="hidden" name="payer" value={payer} />
      <input type="hidden" name="stageId" value={stageId} />

      {/* 1. Respaldo */}
      <section aria-labelledby="respaldo">
        <h2 id="respaldo" className="sr-only">Respaldo</h2>
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => onFiles(e.target.files)} />
        <input ref={fileRef} type="file" accept="image/*,application/pdf,.pdf,.xml,text/xml,application/xml" multiple className="sr-only" onChange={(e) => onFiles(e.target.files)} />
        {files.length === 0 ? (
          <div className="grid grid-cols-[1fr_auto] gap-2.5">
            <button
              type="button"
              onClick={() => cameraRef.current?.click()}
              disabled={uploading}
              className="flex min-h-[88px] items-center gap-4 rounded-card border border-brand/20 bg-brand-soft/70 px-5 text-left transition-colors hover:bg-brand-soft disabled:opacity-60"
            >
              <span className="grid size-12 shrink-0 place-items-center rounded-full bg-brand text-white">
                {uploading ? <LoaderCircle className="size-6 animate-spin" aria-hidden /> : <Camera className="size-6" aria-hidden />}
              </span>
              <span>
                <span className="block text-[16px] font-semibold text-brand-strong">{uploading ? "Leyendo el recibo…" : "Tomar foto del recibo"}</span>
                <span className="block text-[13.5px] text-ink-2">{aiEnabled ? "Se llenan solos el monto y el proveedor" : "Queda guardada como respaldo"}</span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="flex min-h-[88px] w-[104px] flex-col items-center justify-center gap-1.5 rounded-card border border-line-strong bg-surface text-[13px] font-semibold text-ink-2 hover:border-ink-3"
            >
              <FileText className="size-6" aria-hidden />
              PDF o XML
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <ul className="flex gap-2.5 overflow-x-auto pb-1">
              {files.map((f) => (
                <li key={f.id} className="relative shrink-0">
                  {f.preview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={f.preview} alt={`Respaldo ${f.name}`} className="h-24 w-20 rounded-control border border-line object-cover" />
                  ) : (
                    <div className="grid h-24 w-20 place-items-center rounded-control border border-line bg-sunken px-1 text-center text-[11.5px] font-semibold text-ink-2">
                      <FileText className="mx-auto size-6" aria-hidden />
                      {f.isXml ? "XML" : "PDF"}
                    </div>
                  )}
                  <button
                    type="button"
                    aria-label={`Quitar ${f.name}`}
                    onClick={() => setFiles((all) => all.filter((x) => x.id !== f.id))}
                    className="absolute -right-2 -top-2 grid size-7 place-items-center rounded-full bg-ink text-white shadow-raise"
                  >
                    <X className="size-4" aria-hidden />
                  </button>
                </li>
              ))}
              <li className="shrink-0">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="grid h-24 w-20 place-items-center rounded-control border border-dashed border-line-strong text-[12px] font-semibold text-ink-2"
                >
                  {uploading ? <LoaderCircle className="size-5 animate-spin" aria-hidden /> : "Agregar otro"}
                </button>
              </li>
            </ul>
            {readInfo === "xml" && <ReadNote icon="ok">Datos tomados de la factura electrónica.</ReadNote>}
            {readInfo === "ia" && <ReadNote icon="ai">Se llenó con lo que se leyó en el recibo. Revise el monto antes de guardar.</ReadNote>}
            {readInfo === "none" && <ReadNote icon="warn">No se pudo leer el recibo. Llene los datos a mano.</ReadNote>}
          </div>
        )}
        {uploadError && (
          <p role="alert" className="mt-2 text-[14px] font-medium text-danger">
            {uploadError}
          </p>
        )}
        {duplicate && (
          <div className="mt-3 flex gap-2.5 rounded-control border border-warn/30 bg-warn-soft px-3.5 py-3 text-[14px] text-warn">
            <TriangleAlert className="mt-0.5 size-[18px] shrink-0" aria-hidden />
            <p>
              Parece que ya está registrado: <span className="font-semibold">{duplicate.description}</span>.{" "}
              <Link href={`/p/${projectId}/gastos/${duplicate.id}`} className="font-semibold underline">
                Ver ese gasto
              </Link>
            </p>
          </div>
        )}
      </section>

      {/* 2. Monto */}
      <Field label="Monto" htmlFor="total">
        <div className="relative">
          <span aria-hidden className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[26px] font-semibold text-ink-3">
            ₡
          </span>
          <input
            id="total"
            name="total"
            inputMode="numeric"
            autoComplete="off"
            placeholder="0"
            value={amount}
            onChange={(e) => setAmount(groupDigits(e.target.value))}
            className={cx(inputClass, "tnum min-h-16 pl-10 text-[30px] font-semibold tracking-[-0.02em]")}
            required
          />
        </div>
        {prefill.currency === "USD" && prefill.originalTotal && (
          <p className="text-[13px] text-ink-3">
            Factura en dólares: US${prefill.originalTotal.toLocaleString("en-US")} al tipo de cambio {prefill.exchangeRate}.
          </p>
        )}
      </Field>

      {/* 3. Quién pagó */}
      <fieldset>
        <legend className="mb-2 text-[14px] font-semibold">¿Quién pagó?</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {payerOptions.map((o) => (
            <ChoiceButton key={o.value} selected={payer === o.value} onClick={() => setPayer(o.value)} color={o.color}>
              <PayerChip name={o.chip} color={o.color} size="sm" />
              {o.label}
            </ChoiceButton>
          ))}
          {partners.length >= 2 && (
            <ChoiceButton selected={payer === "mitad"} onClick={() => setPayer("mitad")}>
              <span aria-hidden className="flex -space-x-1.5">
                {partners.slice(0, 2).map((p) => (
                  <span key={p.id} className={cx("size-6 rounded-full ring-2 ring-surface", noteBg(p.color))} />
                ))}
              </span>
              Mitad y mitad
            </ChoiceButton>
          )}
          <ChoiceButton selected={payer === "pendiente"} onClick={() => setPayer("pendiente")}>
            <span aria-hidden className="size-6 rounded-full border-2 border-dashed border-ink-3" />
            Queda por pagar
          </ChoiceButton>
        </div>
        {payer === "pendiente" && (
          <div className="mt-3 max-w-[220px]">
            <Field label="Vence el" htmlFor="dueDate" hint="Opcional. Aparece en el resumen.">
              <Input id="dueDate" name="dueDate" type="date" />
            </Field>
          </div>
        )}
        <p className="mt-2 text-[13px] text-ink-3">Si alguien más pagó con dinero de un socio, elija a ese socio.</p>
      </fieldset>

      {/* 4. Etapa */}
      <fieldset>
        <legend className="mb-2 text-[14px] font-semibold">Etapa</legend>
        <div className="flex flex-wrap gap-2">
          {stages.map((s) => (
            <button
              key={s.id}
              type="button"
              aria-pressed={stageId === s.id}
              onClick={() => setStageId(s.id)}
              className={cx(
                "min-h-11 rounded-full border px-4 text-[14.5px] font-medium transition-colors",
                stageId === s.id ? "border-brand bg-brand text-white" : "border-line-strong bg-surface text-ink hover:border-ink-3",
              )}
            >
              {s.name}
            </button>
          ))}
        </div>
      </fieldset>

      {/* 5. Detalle */}
      <div className="space-y-4">
        <Field label="¿Qué se compró o pagó?" htmlFor="description">
          <Input id="description" name="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ej.: Cemento y varilla para zapatas" required />
        </Field>
        <div className="grid gap-4 sm:grid-cols-[1fr_200px]">
          <Field label="A quién se le pagó" htmlFor="supplier" hint="Opcional">
            <Input id="supplier" name="supplier" value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="Ferretería, persona…" />
          </Field>
          <Field label="Fecha" htmlFor="date">
            <Input id="date" name="date" type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} required />
          </Field>
        </div>
        {files.length > 0 && (
          <Field label="Tipo de respaldo" htmlFor="rt">
            <div id="rt" className="flex flex-wrap gap-2">
              {(["FACTURA", "TIQUETE", "NOTA", "COMPROBANTE"] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  aria-pressed={receiptType === k}
                  onClick={() => setReceiptType(k)}
                  className={cx(
                    "min-h-10 rounded-full border px-3.5 text-[13.5px] font-medium",
                    receiptType === k ? "border-ink bg-ink text-white" : "border-line-strong bg-surface text-ink-2",
                  )}
                >
                  {RECEIPT_LABEL[k]}
                </button>
              ))}
            </div>
          </Field>
        )}
        {prefill.lines && prefill.lines.length > 0 && (
          <details className="rounded-control border border-line bg-surface px-4 py-3 text-[14px]">
            <summary className="cursor-pointer font-semibold">Detalle leído ({prefill.lines.length} líneas)</summary>
            <ul className="mt-2 divide-y divide-line">
              {prefill.lines.map((l, i) => (
                <li key={i} className="flex justify-between gap-3 py-1.5">
                  <span className="min-w-0 text-ink-2">
                    {l.quantity} × {l.description}
                  </span>
                  <span className="tnum shrink-0 font-medium">₡{groupDigits(String(l.total))}</span>
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>

      {state.error && (
        <p role="alert" className="rounded-control bg-danger-soft px-3.5 py-2.5 text-[14.5px] font-medium text-danger">
          {state.error}
        </p>
      )}

      <div className="sticky bottom-0 z-10 -mx-4 border-t border-line bg-ground/95 px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 backdrop-blur lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:p-0">
        <Button type="submit" disabled={pending || uploading} className="min-h-[52px] w-full text-[16px] lg:w-auto lg:px-8">
          {pending ? "Guardando…" : "Guardar gasto"}
        </Button>
      </div>
    </form>
  );
}

function ChoiceButton({ selected, onClick, color, children }: { selected: boolean; onClick: () => void; color?: number | "caja"; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cx(
        "flex min-h-12 items-center gap-2.5 rounded-control border px-3 text-left text-[14.5px] font-semibold transition-[border-color,background-color] duration-150",
        selected ? cx("border-ink ring-2 ring-ink/80", color !== undefined ? noteSoft(color) : "bg-sunken") : "border-line-strong bg-surface hover:border-ink-3",
      )}
    >
      {children}
    </button>
  );
}

function ReadNote({ icon, children }: { icon: "ok" | "ai" | "warn"; children: React.ReactNode }) {
  const tone = icon === "warn" ? "text-warn" : icon === "ai" ? "text-brand" : "text-ok";
  return (
    <p className={cx("flex items-center gap-2 text-[14px] font-medium", tone)}>
      {icon === "ai" ? <Sparkles className="size-4" aria-hidden /> : icon === "warn" ? <TriangleAlert className="size-4" aria-hidden /> : <FileText className="size-4" aria-hidden />}
      {children}
    </p>
  );
}
