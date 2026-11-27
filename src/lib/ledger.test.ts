import { test } from "node:test";
import assert from "node:assert/strict";
import { computeLedger, debts, suggestTopUp } from "./ledger";

const partners = [
  { id: "a", share: 50 },
  { id: "b", share: 50 },
];

const empty = { directPayments: [], deposits: [], cashPayments: [], transfers: [] };

test("ejemplo del plan: A puso 4M y B 2M, B le debe 1M a A", () => {
  const l = computeLedger({
    partners,
    directPayments: [
      { partnerId: "a", amount: 3_000_000 },
      { partnerId: "b", amount: 1_000_000 },
    ],
    deposits: [
      { partnerId: "a", amount: 1_000_000 },
      { partnerId: "b", amount: 1_000_000 },
    ],
    cashPayments: [],
    transfers: [],
  });
  assert.equal(l.totalContributed, 6_000_000);
  assert.deepEqual(debts(l), [{ fromPartnerId: "b", toPartnerId: "a", amount: 1_000_000 }]);
});

test("los pagos desde la caja chica no cambian el saldo entre socios", () => {
  const base = { partners, ...empty, deposits: [{ partnerId: "a", amount: 500_000 }, { partnerId: "b", amount: 500_000 }] };
  const before = computeLedger(base);
  const after = computeLedger({ ...base, cashPayments: [{ amount: 300_000 }] });
  assert.deepEqual(debts(before), []);
  assert.deepEqual(debts(after), []);
  assert.equal(after.cash.balance, 700_000);
});

test("una liquidación empareja las cuentas", () => {
  const l = computeLedger({
    partners,
    ...empty,
    directPayments: [{ partnerId: "a", amount: 2_000_000 }],
    transfers: [{ fromPartnerId: "b", toPartnerId: "a", amount: 1_000_000 }],
  });
  assert.deepEqual(debts(l), []);
  assert.equal(l.partners.find((p) => p.partnerId === "a")!.contributed, 1_000_000);
});

test("sin movimientos no hay deudas", () => {
  const l = computeLedger({ partners, ...empty });
  assert.deepEqual(debts(l), []);
  assert.equal(l.cash.balance, 0);
});

test("recarga sugerida: el que va atrás pone todo si alcanza para emparejar", () => {
  const l = computeLedger({
    partners,
    ...empty,
    directPayments: [{ partnerId: "a", amount: 4_000_000 }, { partnerId: "b", amount: 2_000_000 }],
  });
  assert.deepEqual(suggestTopUp(l, 2_000_000), [
    { partnerId: "a", amount: 0 },
    { partnerId: "b", amount: 2_000_000 },
  ]);
});

test("recarga sugerida: si la recarga es menor que la diferencia, la pone toda el que va atrás", () => {
  const l = computeLedger({ partners, ...empty, directPayments: [{ partnerId: "a", amount: 4_000_000 }] });
  assert.deepEqual(suggestTopUp(l, 1_000_000), [
    { partnerId: "a", amount: 0 },
    { partnerId: "b", amount: 1_000_000 },
  ]);
});

test("recarga sugerida: parejos, se divide a la mitad y la suma es exacta", () => {
  const l = computeLedger({ partners, ...empty });
  const s = suggestTopUp(l, 500_001);
  assert.equal(s[0].amount + s[1].amount, 500_001);
  assert.ok(Math.abs(s[0].amount - s[1].amount) <= 1);
});

test("porcentajes distintos (60/40)", () => {
  const l = computeLedger({
    partners: [
      { id: "a", share: 60 },
      { id: "b", share: 40 },
    ],
    ...empty,
    directPayments: [{ partnerId: "a", amount: 1_000_000 }],
  });
  assert.deepEqual(debts(l), [{ fromPartnerId: "b", toPartnerId: "a", amount: 400_000 }]);
});
