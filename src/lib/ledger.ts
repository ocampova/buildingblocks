/**
 * Cuentas entre socios. Funciones puras: reciben movimientos y devuelven saldos.
 *
 * Lo que puso cada socio = sus pagos directos + sus depósitos a la caja chica
 *   + lo que envió en liquidaciones − lo que recibió en liquidaciones.
 * Los pagos que salen de la caja chica no cuentan a nombre de nadie: ese dinero
 * ya se contó cuando cada socio lo depositó.
 * Solo cuenta lo pagado: un gasto pendiente no mueve el saldo.
 */

export type Partner = { id: string; share: number };
export type DirectPayment = { partnerId: string; amount: number };
export type Deposit = { partnerId: string; amount: number };
export type CashPayment = { amount: number };
export type Transfer = { fromPartnerId: string; toPartnerId: string; amount: number };

export type PartnerBalance = {
  partnerId: string;
  share: number;
  direct: number;
  deposited: number;
  settled: number;
  contributed: number;
  /** Lo que le corresponde según su porcentaje del total puesto */
  owed: number;
  /** Positivo: puso de más. Negativo: le falta poner. */
  balance: number;
};

export type Ledger = {
  partners: PartnerBalance[];
  totalContributed: number;
  cash: { deposited: number; spent: number; balance: number };
};

function sumBy<T>(items: T[], pick: (t: T) => number) {
  return items.reduce((s, t) => s + pick(t), 0);
}

export function computeLedger(input: {
  partners: Partner[];
  directPayments: DirectPayment[];
  deposits: Deposit[];
  cashPayments: CashPayment[];
  transfers: Transfer[];
}): Ledger {
  const shareTotal = sumBy(input.partners, (p) => p.share) || 1;
  const rows = input.partners.map((p) => {
    const direct = sumBy(input.directPayments.filter((x) => x.partnerId === p.id), (x) => x.amount);
    const deposited = sumBy(input.deposits.filter((x) => x.partnerId === p.id), (x) => x.amount);
    const sent = sumBy(input.transfers.filter((x) => x.fromPartnerId === p.id), (x) => x.amount);
    const received = sumBy(input.transfers.filter((x) => x.toPartnerId === p.id), (x) => x.amount);
    const settled = sent - received;
    return { partnerId: p.id, share: p.share, direct, deposited, settled, contributed: direct + deposited + settled };
  });
  const totalContributed = sumBy(rows, (r) => r.contributed);
  const partners = rows.map((r) => {
    const owed = Math.round((totalContributed * r.share) / shareTotal);
    return { ...r, owed, balance: r.contributed - owed };
  });
  const deposited = sumBy(input.deposits, (d) => d.amount);
  const spent = sumBy(input.cashPayments, (c) => c.amount);
  return { partners, totalContributed, cash: { deposited, spent, balance: deposited - spent } };
}

export type Debt = { fromPartnerId: string; toPartnerId: string; amount: number };

/** Quién le debe a quién para quedar parejos. Con dos socios es una sola deuda. */
export function debts(ledger: Ledger): Debt[] {
  const debtors = ledger.partners.filter((p) => p.balance < 0).map((p) => ({ id: p.partnerId, left: -p.balance }));
  const creditors = ledger.partners.filter((p) => p.balance > 0).map((p) => ({ id: p.partnerId, left: p.balance }));
  const out: Debt[] = [];
  for (const d of debtors) {
    for (const c of creditors) {
      if (d.left <= 0) break;
      if (c.left <= 0) continue;
      const amount = Math.min(d.left, c.left);
      out.push({ fromPartnerId: d.id, toPartnerId: c.id, amount });
      d.left -= amount;
      c.left -= amount;
    }
  }
  return out.filter((x) => x.amount > 0);
}

/**
 * Cuánto debería depositar cada socio al recargar la caja chica con `amount`,
 * para que además las cuentas queden lo más parejas posible.
 * Para cada socio: porcentaje × (total puesto + recarga) − lo que ya puso,
 * sin bajar de cero, ajustado para que la suma sea exactamente la recarga.
 */
export function suggestTopUp(ledger: Ledger, amount: number): { partnerId: string; amount: number }[] {
  if (amount <= 0 || ledger.partners.length === 0) return ledger.partners.map((p) => ({ partnerId: p.partnerId, amount: 0 }));
  const shareTotal = sumBy(ledger.partners, (p) => p.share) || 1;
  const after = ledger.totalContributed + amount;
  const targets = ledger.partners.map((p) => ({
    partnerId: p.partnerId,
    raw: Math.max(0, (after * p.share) / shareTotal - p.contributed),
  }));
  const rawSum = sumBy(targets, (t) => t.raw);
  const scaled = targets.map((t) => ({ partnerId: t.partnerId, amount: Math.floor((t.raw * amount) / rawSum) }));
  // El residuo del redondeo va al que más pone
  const remainder = amount - sumBy(scaled, (s) => s.amount);
  if (remainder !== 0) {
    const top = scaled.reduce((a, b) => (b.amount > a.amount ? b : a));
    top.amount += remainder;
  }
  return scaled;
}
