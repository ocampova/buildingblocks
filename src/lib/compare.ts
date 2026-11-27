/**
 * Comparación de cotizaciones de un pedido. Funciones puras.
 *
 * Se compara por precio unitario aplicado a la cantidad pedida, para que dos
 * proveedores que cotizan cantidades distintas se puedan comparar igual.
 * Una línea con calidad DISTINTA a la pedida nunca gana "mejor precio" mientras
 * haya otra que cumpla o que no esté clara.
 */

export type Quality = "CUMPLE" | "DISTINTA" | "NO_CLARO";
export type CmpOrderLine = { id: string; quantity: number };
export type CmpQuoteLine = { id: string; orderLineId: string | null; unitPrice: number; quality: Quality };
export type CmpQuote = { id: string; transport: number | null; lines: CmpQuoteLine[] };

export type Cell = { quoteId: string; quoteLineId: string; unitPrice: number; cost: number; quality: Quality };

export type LineComparison = {
  orderLineId: string;
  cells: Record<string, Cell | undefined>;
  /** quoteId con el mejor precio que respeta la calidad (o el mejor a secas si ninguno la respeta) */
  bestQuoteId: string | null;
  /** Ninguna cotización trae esta línea */
  uncovered: boolean;
};

export type QuoteSummary = {
  quoteId: string;
  covered: number;
  missing: number;
  differentQuality: number;
  /** Costo de las líneas que trae, a la cantidad pedida, más transporte */
  total: number;
  /** Trae todas las líneas */
  complete: boolean;
};

export type Comparison = {
  lines: LineComparison[];
  quotes: QuoteSummary[];
  /** Mezcla: el mejor proveedor por línea */
  bestMix: { total: number; picks: { orderLineId: string; quoteId: string; quoteLineId: string }[]; suppliers: number };
  /** El proveedor más barato que trae todo, si existe */
  bestSingle: { quoteId: string; total: number } | null;
};

const rank = (q: Quality) => (q === "DISTINTA" ? 1 : 0);

export function compareQuotes(orderLines: CmpOrderLine[], quotes: CmpQuote[]): Comparison {
  const lines: LineComparison[] = orderLines.map((ol) => {
    const cells: Record<string, Cell | undefined> = {};
    for (const q of quotes) {
      // Si un proveedor trae dos opciones para la misma línea, se queda la mejor
      const options = q.lines
        .filter((l) => l.orderLineId === ol.id && l.unitPrice > 0)
        .sort((a, b) => rank(a.quality) - rank(b.quality) || a.unitPrice - b.unitPrice);
      const l = options[0];
      if (l) cells[q.id] = { quoteId: q.id, quoteLineId: l.id, unitPrice: l.unitPrice, cost: Math.round(l.unitPrice * ol.quantity), quality: l.quality };
    }
    const present = Object.values(cells).filter((c): c is Cell => Boolean(c));
    const best = present.sort((a, b) => rank(a.quality) - rank(b.quality) || a.cost - b.cost)[0];
    return { orderLineId: ol.id, cells, bestQuoteId: best?.quoteId ?? null, uncovered: present.length === 0 };
  });

  const summaries: QuoteSummary[] = quotes.map((q) => {
    const mine = lines.map((l) => l.cells[q.id]).filter((c): c is Cell => Boolean(c));
    const covered = mine.length;
    return {
      quoteId: q.id,
      covered,
      missing: orderLines.length - covered,
      differentQuality: mine.filter((c) => c.quality === "DISTINTA").length,
      total: mine.reduce((s, c) => s + c.cost, 0) + (covered > 0 ? q.transport ?? 0 : 0),
      complete: covered === orderLines.length && orderLines.length > 0,
    };
  });

  const picks = lines.filter((l) => l.bestQuoteId).map((l) => ({ orderLineId: l.orderLineId, quoteId: l.bestQuoteId!, quoteLineId: l.cells[l.bestQuoteId!]!.quoteLineId }));
  const usedQuotes = new Set(picks.map((p) => p.quoteId));
  const mixTotal =
    picks.reduce((s, p) => s + lines.find((l) => l.orderLineId === p.orderLineId)!.cells[p.quoteId]!.cost, 0) +
    [...usedQuotes].reduce((s, id) => s + (quotes.find((q) => q.id === id)!.transport ?? 0), 0);

  const singles = summaries.filter((s) => s.complete && s.differentQuality === 0).sort((a, b) => a.total - b.total);
  return {
    lines,
    quotes: summaries,
    bestMix: { total: mixTotal, picks, suppliers: usedQuotes.size },
    bestSingle: singles[0] ? { quoteId: singles[0].quoteId, total: singles[0].total } : null,
  };
}

/** Días que faltan para una fecha YYYY-MM-DD (negativo si ya pasó). */
export function daysUntil(dateKey: string, todayKey: string) {
  return Math.round((Date.parse(dateKey) - Date.parse(todayKey)) / 86400000);
}
