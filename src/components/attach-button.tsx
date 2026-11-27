"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Paperclip } from "lucide-react";
import { uploadReceipt } from "./upload";

/** Agrega un respaldo a un gasto que ya existe. */
export function AttachButton({ projectId, onUploaded }: { projectId: string; onUploaded: (attachmentId: string) => Promise<void> }) {
  const ref = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [, start] = useTransition();
  const router = useRouter();
  return (
    <div>
      <input
        ref={ref}
        type="file"
        accept="image/*,application/pdf,.pdf,.xml"
        className="sr-only"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          setBusy(true);
          setError(undefined);
          try {
            const res = await uploadReceipt(projectId, file);
            await onUploaded(res.attachmentId);
            start(() => router.refresh());
          } catch (err) {
            setError(err instanceof Error ? err.message : "No se pudo subir.");
          } finally {
            setBusy(false);
            if (ref.current) ref.current.value = "";
          }
        }}
      />
      <button
        type="button"
        onClick={() => ref.current?.click()}
        disabled={busy}
        className="grid h-24 w-20 place-items-center rounded-control border border-dashed border-line-strong px-1 text-center text-[12px] font-semibold text-ink-2 hover:border-ink-3"
      >
        {busy ? <LoaderCircle className="size-5 animate-spin" aria-hidden /> : <span><Paperclip className="mx-auto mb-1 size-5" aria-hidden />Agregar respaldo</span>}
      </button>
      {error && <p role="alert" className="mt-1 max-w-[200px] text-[13px] text-danger">{error}</p>}
    </div>
  );
}
