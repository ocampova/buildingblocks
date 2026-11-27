"use client";

import { useState, useTransition } from "react";
import { Check, Copy, ExternalLink, Globe, LoaderCircle, MessageCircle, Phone, Plus, Search, TriangleAlert } from "lucide-react";
import type { ActionState } from "./action-form";
import { Button, cx } from "./ui";
import type { SupplierSearch } from "@/lib/supplier-ai";

type Known = { name: string; phone: string | null };

const wa = (phone: string, text: string) => `https://wa.me/506${phone}?text=${encodeURIComponent(text)}`;
const fmtPhone = (p: string) => `${p.slice(0, 4)} ${p.slice(4)}`;

/**
 * Proveedores para cotizar un pedido: el mensaje de WhatsApp listo para enviar,
 * los proveedores ya guardados y, con IA, una búsqueda en internet de proveedores cercanos.
 */
export function SupplierFinder({
  message,
  known,
  saved,
  searchedAt,
  aiEnabled,
  hasLocation,
  settingsHref,
  find,
  save,
}: {
  message: string;
  known: Known[];
  saved: SupplierSearch | null;
  searchedAt: string | null;
  aiEnabled: boolean;
  hasLocation: boolean;
  settingsHref: string;
  find: () => Promise<ActionState>;
  save: (name: string, phone: string | null) => Promise<ActionState>;
}) {
  const [pending, start] = useTransition();
  const [state, setState] = useState<ActionState>({});
  const [copied, setCopied] = useState(false);
  const [added, setAdded] = useState<string[]>([]);
  const withPhone = known.filter((k) => k.phone);

  return (
    <div className="space-y-4">
      <div className="rounded-card border border-line bg-surface p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-[16px] font-semibold">Mensaje para pedir cotización</h3>
            <p className="text-[14px] text-ink-2">Listo para mandar por WhatsApp a cualquier proveedor.</p>
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={async () => {
              await navigator.clipboard.writeText(message);
              setCopied(true);
            }}
          >
            {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
            {copied ? "Copiado" : "Copiar mensaje"}
          </Button>
        </div>
        <pre className="mt-3 max-h-56 overflow-auto whitespace-pre-wrap rounded-control bg-sunken px-3.5 py-3 font-sans text-[14px] leading-relaxed text-ink-2">{message}</pre>
        {withPhone.length > 0 && (
          <div className="mt-3">
            <p className="mb-2 text-[13.5px] font-semibold text-ink-2">Enviar a sus proveedores</p>
            <div className="flex flex-wrap gap-2">
              {withPhone.map((k) => (
                <a
                  key={k.name}
                  href={wa(k.phone!, message)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-line-strong bg-surface px-3.5 text-[14px] font-medium hover:border-ink-3"
                >
                  <MessageCircle className="size-4 text-ok" aria-hidden />
                  {k.name}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="rounded-card border border-brand/20 bg-brand-soft/50 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 max-w-[60ch]">
            <h3 className="text-[16px] font-semibold text-brand-strong">Buscar proveedores con IA</h3>
            <p className="text-[14px] text-ink-2">
              {!aiEnabled
                ? "Disponible cuando se configure la clave de IA en Railway (OPENAI_API_KEY)."
                : !hasLocation
                  ? "Primero ponga la ubicación de la obra en Ajustes › Proyecto."
                  : "Busca en internet ferreterías y depósitos cerca de la obra que vendan estos materiales."}
            </p>
          </div>
          {aiEnabled && hasLocation ? (
            <Button
              type="button"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  setState({});
                  setState(await find());
                })
              }
            >
              {pending ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <Search className="size-4" aria-hidden />}
              {pending ? "Buscando…" : saved ? "Buscar de nuevo" : "Buscar proveedores"}
            </Button>
          ) : (
            !hasLocation && (
              <a href={settingsHref} className="inline-flex min-h-11 items-center text-[15px] font-semibold text-brand underline">
                Ir a Ajustes
              </a>
            )
          )}
        </div>
        {pending && <p className="mt-3 text-[14px] text-brand">Buscando en internet. Puede tardar hasta un minuto.</p>}
        {state.error && <p role="alert" className="mt-3 rounded-control bg-danger-soft px-3.5 py-2.5 text-[14px] font-medium text-danger">{state.error}</p>}
      </div>

      {saved && (
        <div>
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-[14px] text-ink-2">
              {saved.suppliers.length} {saved.suppliers.length === 1 ? "sugerencia" : "sugerencias"}
              {searchedAt ? `, búsqueda del ${searchedAt}` : ""}.
            </p>
            <p className="flex items-center gap-1.5 text-[13px] text-warn">
              <TriangleAlert className="size-3.5" aria-hidden /> Confirme los datos antes de comprar: la IA puede equivocarse.
            </p>
          </div>
          {saved.note && <p className="mb-3 rounded-control bg-warn-soft px-3.5 py-2.5 text-[14px] text-warn">{saved.note}</p>}
          <ul className="grid gap-3 md:grid-cols-2">
            {saved.suppliers.map((s) => {
              const phone = s.whatsapp ?? s.phone;
              const mine = known.find((k) => k.name === s.name);
              // Ya está guardado (con teléfono, o sin teléfono que agregar)
              const isKnown = added.includes(s.name) || Boolean(mine && (mine.phone || !phone));
              const label = mine && !mine.phone ? "Guardar teléfono" : "Guardar proveedor";
              return (
                <li key={s.name} className="flex flex-col rounded-card border border-line bg-surface p-4">
                  <p className="text-[15.5px] font-semibold">{s.name}</p>
                  <p className="text-[13px] text-ink-3">
                    {s.kind}
                    {s.town ? `, ${s.town}` : ""}
                  </p>
                  {s.address && <p className="mt-1 text-[13.5px] text-ink-2">{s.address}</p>}
                  <p className="mt-2 text-[14px] text-ink-2">
                    <span className="font-semibold text-ink">Tendría:</span> {s.materials}
                  </p>
                  <p className="mt-1 text-[14px] text-ink-2">{s.why}</p>
                  <div className="mt-auto flex flex-wrap gap-2 pt-3">
                    {phone && (
                      <a href={wa(phone, message)} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-1.5 rounded-control bg-ok px-3 text-[14px] font-semibold text-white">
                        <MessageCircle className="size-4" aria-hidden /> Pedir cotización
                      </a>
                    )}
                    {s.phone && (
                      <a href={`tel:+506${s.phone}`} className="inline-flex min-h-10 items-center gap-1.5 rounded-control border border-line-strong px-3 text-[14px] font-medium">
                        <Phone className="size-4" aria-hidden /> {fmtPhone(s.phone)}
                      </a>
                    )}
                    {s.website && (
                      <a href={s.website} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-1.5 rounded-control border border-line-strong px-3 text-[14px] font-medium">
                        <Globe className="size-4" aria-hidden /> Sitio
                      </a>
                    )}
                    <button
                      type="button"
                      disabled={isKnown}
                      onClick={async () => {
                        const r = await save(s.name, phone);
                        if (!r.error) setAdded((a) => [...a, s.name]);
                      }}
                      className={cx("inline-flex min-h-10 items-center gap-1.5 rounded-control px-3 text-[14px] font-medium", isKnown ? "text-ink-3" : "text-brand hover:bg-brand-soft")}
                    >
                      {isKnown ? <Check className="size-4" aria-hidden /> : <Plus className="size-4" aria-hidden />}
                      {isKnown ? "En sus proveedores" : label}
                    </button>
                  </div>
                  {s.sourceUrl && (
                    <a href={s.sourceUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 self-start text-[12.5px] text-ink-3 underline">
                      Fuente <ExternalLink className="size-3" aria-hidden />
                    </a>
                  )}
                  {!phone && <p className="mt-2 text-[12.5px] text-ink-3">No se encontró teléfono: búsquelo en la fuente.</p>}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
