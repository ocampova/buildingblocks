import { cx, PayerChip } from "./ui";

/** Elegir quién pagó con radios nativos (para formularios de servidor). */
export function PayerRadios({ partners, name = "payer", includeSplit = true, defaultValue }: { partners: { id: string; name: string; color: number }[]; name?: string; includeSplit?: boolean; defaultValue?: string }) {
  const opts = [
    ...partners.map((p) => ({ value: `socio:${p.id}`, label: p.name.split(" ")[0], chip: <PayerChip name={p.name} color={p.color} size="sm" /> })),
    { value: "caja", label: "Caja chica", chip: <PayerChip name="Caja" color="caja" size="sm" /> },
    ...(includeSplit && partners.length >= 2 ? [{ value: "mitad", label: "Mitad y mitad", chip: null }] : []),
  ];
  return (
    <fieldset>
      <legend className="mb-2 text-[14px] font-semibold">¿Quién pagó?</legend>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {opts.map((o, i) => (
          <label
            key={o.value}
            className={cx(
              "flex min-h-12 cursor-pointer items-center gap-2.5 rounded-control border border-line-strong bg-surface px-3 text-[14.5px] font-semibold",
              "has-[:checked]:border-ink has-[:checked]:bg-sunken has-[:checked]:ring-2 has-[:checked]:ring-ink/80 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand",
            )}
          >
            <input type="radio" name={name} value={o.value} defaultChecked={defaultValue ? defaultValue === o.value : i === 0} className="sr-only" />
            {o.chip}
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
