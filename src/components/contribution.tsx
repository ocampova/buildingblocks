import Link from "next/link";
import { crc, firstName } from "@/lib/format";
import { cx, noteBg, PayerChip } from "./ui";

type PartnerShare = { id: string; name: string; color: number; contributed: number; share: number; balance: number };

/**
 * Barra de aportes: un segmento por socio, en el color de su billete, con una muesca donde
 * caería el reparto justo. Se ve de un vistazo quién va adelante.
 */
export function ContributionBar({ partners, height = "h-3.5" }: { partners: PartnerShare[]; height?: string }) {
  const total = partners.reduce((s, p) => s + p.contributed, 0);
  const shareTotal = partners.reduce((s, p) => s + p.share, 0) || 1;
  let acc = 0;
  const notches = partners.slice(0, -1).map((p) => {
    acc += p.share;
    return (acc / shareTotal) * 100;
  });
  return (
    <div className="relative">
      <div className={cx("flex w-full overflow-hidden rounded-full bg-sunken", height)} role="img" aria-label={partners.map((p) => `${p.name}: ${crc(p.contributed)}`).join(", ")}>
        {total > 0 &&
          partners.map((p, i) => (
            <div
              key={p.id}
              className={cx("grow-x h-full", noteBg(p.color), i > 0 && "border-l-2 border-surface")}
              style={{ width: `${(p.contributed / total) * 100}%`, animationDelay: `${i * 90}ms` }}
            />
          ))}
      </div>
      {notches.map((n) => (
        <span key={n} aria-hidden className="absolute -top-1 -bottom-1 w-0.5 -translate-x-1/2 rounded-full bg-ink" style={{ left: `${n}%` }} />
      ))}
    </div>
  );
}

/** Frase de quién le debe a quién, desde el punto de vista de quien mira. */
export function debtSentence(d: { from: { id: string; name: string }; to: { id: string; name: string }; amount: number }, viewerMemberId?: string) {
  if (d.to.id === viewerMemberId) return { lead: `${firstName(d.from.name)} le debe a usted`, amount: d.amount };
  if (d.from.id === viewerMemberId) return { lead: `Usted le debe a ${firstName(d.to.name)}`, amount: d.amount };
  return { lead: `${firstName(d.from.name)} le debe a ${firstName(d.to.name)}`, amount: d.amount };
}

export function NettingCard({
  projectId,
  partners,
  debts,
  viewerMemberId,
  compact,
}: {
  projectId: string;
  partners: PartnerShare[];
  debts: { from: { id: string; name: string }; to: { id: string; name: string }; amount: number }[];
  viewerMemberId?: string;
  compact?: boolean;
}) {
  const total = partners.reduce((s, p) => s + p.contributed, 0);
  const main = debts[0];
  const sentence = main ? debtSentence(main, viewerMemberId) : null;
  return (
    <section className="guilloche relative overflow-hidden rounded-card border border-brand/15 bg-brand-soft/55 p-5 shadow-raise lg:p-6">
      <h2 className="sr-only">Cuentas entre socios</h2>
      {sentence ? (
        <>
          <p className="text-[15px] font-medium text-ink-2">{sentence.lead}</p>
          <p className="font-figure mt-1 text-[40px] font-semibold leading-none text-brand-strong lg:text-[46px]">{crc(sentence.amount)}</p>
        </>
      ) : (
        <>
          <p className="text-[15px] font-medium text-ink-2">{total > 0 ? "Las cuentas están" : "Todavía no hay aportes"}</p>
          <p className="font-figure mt-1 text-[34px] font-semibold leading-none text-brand-strong">{total > 0 ? "Parejas" : "Sin movimientos"}</p>
        </>
      )}

      {partners.length > 0 && (
        <div className="mt-5">
          <ContributionBar partners={partners} />
          <ul className={cx("mt-3 grid gap-x-4 gap-y-2", partners.length > 2 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-2")}>
            {partners.map((p, i) => (
              <li key={p.id} className={cx("flex min-w-0 items-center gap-2.5", partners.length === 2 && i === 1 && "justify-end text-right")}>
                {!(partners.length === 2 && i === 1) && <PayerChip name={p.name} color={p.color} size="sm" />}
                <div className="min-w-0">
                  <p className="truncate text-[13.5px] text-ink-2">
                    {firstName(p.name)} · {p.share} %
                  </p>
                  <p className="font-figure text-[15.5px] font-semibold">{crc(p.contributed)}</p>
                </div>
                {partners.length === 2 && i === 1 && <PayerChip name={p.name} color={p.color} size="sm" />}
              </li>
            ))}
          </ul>
        </div>
      )}

      {!compact && main && (
        <div className="mt-5 flex flex-wrap gap-2">
          <Link
            href={`/p/${projectId}/cuentas#emparejar`}
            className="inline-flex min-h-11 items-center rounded-control bg-brand px-4 text-[15px] font-semibold text-white shadow-raise transition-colors hover:bg-brand-strong"
          >
            Emparejar cuentas
          </Link>
        </div>
      )}
    </section>
  );
}
