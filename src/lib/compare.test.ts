import { test } from "node:test";
import assert from "node:assert/strict";
import { compareQuotes, daysUntil, type CmpQuote } from "./compare";

const order = [
  { id: "cemento", quantity: 20 },
  { id: "varilla", quantity: 50 },
  { id: "alambre", quantity: 2 },
];

const epa: CmpQuote = {
  id: "A",
  transport: 15000,
  lines: [
    { id: "a1", orderLineId: "cemento", unitPrice: 6500, quality: "CUMPLE" },
    { id: "a2", orderLineId: "varilla", unitPrice: 2900, quality: "CUMPLE" },
    { id: "a3", orderLineId: "alambre", unitPrice: 1800, quality: "CUMPLE" },
  ],
};
const lagar: CmpQuote = {
  id: "B",
  transport: 0,
  lines: [
    { id: "b1", orderLineId: "cemento", unitPrice: 6200, quality: "DISTINTA" },
    { id: "b2", orderLineId: "varilla", unitPrice: 2750, quality: "CUMPLE" },
  ],
};

test("mejor precio por línea respeta la calidad pedida", () => {
  const c = compareQuotes(order, [epa, lagar]);
  const cemento = c.lines.find((l) => l.orderLineId === "cemento")!;
  assert.equal(cemento.bestQuoteId, "A", "el cemento más barato es de otra marca: gana el que cumple");
  assert.equal(c.lines.find((l) => l.orderLineId === "varilla")!.bestQuoteId, "B");
});

test("resumen por proveedor: faltantes, calidad distinta y total con transporte", () => {
  const c = compareQuotes(order, [epa, lagar]);
  const a = c.quotes.find((q) => q.quoteId === "A")!;
  const b = c.quotes.find((q) => q.quoteId === "B")!;
  assert.equal(a.total, 20 * 6500 + 50 * 2900 + 2 * 1800 + 15000);
  assert.ok(a.complete);
  assert.equal(b.missing, 1);
  assert.equal(b.differentQuality, 1);
  assert.equal(b.total, 20 * 6200 + 50 * 2750);
});

test("mezcla y mejor proveedor único", () => {
  const c = compareQuotes(order, [epa, lagar]);
  assert.equal(c.bestSingle?.quoteId, "A");
  assert.equal(c.bestMix.suppliers, 2);
  assert.equal(c.bestMix.total, 20 * 6500 + 50 * 2750 + 2 * 1800 + 15000 + 0);
});

test("línea que nadie cotizó queda sin cubrir", () => {
  const c = compareQuotes([...order, { id: "clavos", quantity: 5 }], [epa]);
  assert.ok(c.lines.find((l) => l.orderLineId === "clavos")!.uncovered);
  assert.equal(c.bestSingle, null, "ninguno trae todo");
});

test("se compara a la cantidad pedida aunque coticen otra cantidad", () => {
  const c = compareQuotes([{ id: "x", quantity: 10 }], [
    { id: "A", transport: null, lines: [{ id: "a", orderLineId: "x", unitPrice: 1000, quality: "CUMPLE" }] },
    { id: "B", transport: null, lines: [{ id: "b", orderLineId: "x", unitPrice: 900, quality: "NO_CLARO" }] },
  ]);
  assert.equal(c.lines[0].bestQuoteId, "B");
  assert.equal(c.lines[0].cells.B!.cost, 9000);
});

test("sin cotizaciones", () => {
  const c = compareQuotes(order, []);
  assert.ok(c.lines.every((l) => l.uncovered));
  assert.equal(c.bestMix.total, 0);
});

test("días que faltan", () => {
  assert.equal(daysUntil("2026-12-01", "2026-11-27"), 4);
  assert.equal(daysUntil("2026-11-25", "2026-11-27"), -2);
});
