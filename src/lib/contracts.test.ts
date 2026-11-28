import { test } from "node:test";
import assert from "node:assert/strict";
import { budgetProgress, contractSummary } from "./contracts";

test("contrato con adicionales y abonos", () => {
  const s = contractSummary({
    amount: 100_000_000,
    extras: [{ amount: 3_500_000 }, { amount: 1_500_000 }],
    expenses: [
      { total: 20_000_000, payments: [{ amount: 10_000_000 }, { amount: 10_000_000 }] },
      { total: 15_000_000, payments: [{ amount: 15_000_000 }] },
    ],
  });
  assert.equal(s.total, 105_000_000);
  assert.equal(s.extras, 5_000_000);
  assert.equal(s.paid, 35_000_000);
  assert.equal(s.balance, 70_000_000);
  assert.equal(s.overpaid, 0);
  assert.equal(s.progress.toFixed(4), (35 / 105).toFixed(4));
});

test("un abono registrado pero sin pagar no cuenta como abonado", () => {
  const s = contractSummary({ amount: 10_000_000, extras: [], expenses: [{ total: 2_000_000, payments: [] }] });
  assert.equal(s.paid, 0);
  assert.equal(s.balance, 10_000_000);
});

test("pagado de más se reporta aparte y el saldo no es negativo", () => {
  const s = contractSummary({ amount: 1_000_000, extras: [], expenses: [{ total: 1_200_000, payments: [{ amount: 1_200_000 }] }] });
  assert.equal(s.balance, 0);
  assert.equal(s.overpaid, 200_000);
  assert.equal(s.progress, 1);
});

test("meta: gastado más saldo de contratos", () => {
  const b = budgetProgress(160_000_000, 40_000_000, 70_000_000);
  assert.equal(b.committed, 110_000_000);
  assert.equal(b.remaining, 50_000_000);
  assert.equal(b.over, false);
  assert.equal(b.spentShare, 0.25);
});

test("meta superada", () => {
  const b = budgetProgress(100, 80, 30);
  assert.equal(b.over, true);
  assert.equal(b.remaining, -10);
});
