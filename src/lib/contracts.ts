/**
 * Cuentas de un contrato y avance contra el presupuesto meta. Funciones puras.
 *
 * Total del contrato = monto contratado + obras adicionales.
 * Abonado = lo efectivamente pagado en los gastos ligados al contrato.
 * Saldo = total − abonado (nunca negativo; si se pagó de más, se reporta aparte).
 */

export type ContractInput = {
  amount: number;
  extras: { amount: number }[];
  expenses: { total: number; payments: { amount: number }[] }[];
};

export type ContractSummary = {
  contracted: number;
  extras: number;
  total: number;
  paid: number;
  balance: number;
  /** Pagado de más sobre el total */
  overpaid: number;
  /** 0 a 1 */
  progress: number;
};

export function contractSummary(c: ContractInput): ContractSummary {
  const extras = c.extras.reduce((s, e) => s + e.amount, 0);
  const total = c.amount + extras;
  const paid = c.expenses.reduce((s, e) => s + e.payments.reduce((a, p) => a + p.amount, 0), 0);
  return {
    contracted: c.amount,
    extras,
    total,
    paid,
    balance: Math.max(0, total - paid),
    overpaid: Math.max(0, paid - total),
    progress: total > 0 ? Math.min(1, paid / total) : 0,
  };
}

export type BudgetProgress = {
  target: number;
  spent: number;
  /** Lo gastado más lo que falta pagar de los contratos */
  committed: number;
  spentShare: number;
  committedShare: number;
  /** Cuánto queda de la meta después de lo comprometido (negativo si ya se pasó) */
  remaining: number;
  over: boolean;
};

export function budgetProgress(target: number, spent: number, contractBalances: number): BudgetProgress {
  const committed = spent + contractBalances;
  return {
    target,
    spent,
    committed,
    spentShare: target > 0 ? spent / target : 0,
    committedShare: target > 0 ? committed / target : 0,
    remaining: target - committed,
    over: committed > target,
  };
}
