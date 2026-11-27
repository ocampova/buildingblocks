import "server-only";
import { prisma } from "./db";
import { getDebtSummary } from "./data";
import { crc, firstName, todayKey } from "./format";
import { buildWorkbook, type Column, type Sheet } from "./xlsx";

const RECEIPT = { FACTURA: "Factura electrónica", TIQUETE: "Tiquete o recibo", NOTA: "Nota a mano", COMPROBANTE: "Comprobante de pago", NINGUNO: "Sin respaldo" } as const;

/** Libro de Excel con gastos, pagos, detalle, etapas, cuentas entre socios y caja chica. Pensado para un contador. */
export async function buildProjectExport(projectId: string) {
  const project = await prisma.project.findUniqueOrThrow({ where: { id: projectId } });
  const [{ ledger, partners, debts }, expenses, stages, deposits, settlements] = await Promise.all([
    getDebtSummary(projectId),
    prisma.expense.findMany({
      where: { projectId },
      include: {
        stage: true,
        order: { select: { number: true } },
        createdBy: { include: { user: { select: { name: true } } } },
        lines: true,
        payments: { include: { partner: { include: { user: { select: { name: true } } } } }, orderBy: { date: "asc" } },
        _count: { select: { attachments: true } },
      },
      orderBy: [{ date: "asc" }, { createdAt: "asc" }],
    }),
    prisma.stage.findMany({ where: { projectId }, orderBy: { position: "asc" } }),
    prisma.cashDeposit.findMany({ where: { projectId }, include: { partner: { include: { user: { select: { name: true } } } } }, orderBy: { date: "asc" } }),
    prisma.settlement.findMany({
      where: { projectId },
      include: { fromPartner: { include: { user: { select: { name: true } } } }, toPartner: { include: { user: { select: { name: true } } } } },
      orderBy: { date: "asc" },
    }),
  ]);

  const today = todayKey().split("-").reverse().join("/");
  const sub = (s: string) => `${project.name} · ${s} · generado el ${today}`;
  const pkey = (id: string) => `p_${id}`;
  const partnerCols: Column[] = partners.map((p) => ({ header: `Pagó ${firstName(p.user.name)}`, key: pkey(p.id), type: "crc", width: 15 }));

  // ─── Gastos ───
  const gastos: Sheet = {
    name: "Gastos",
    title: "Gastos del proyecto",
    subtitle: sub(`${expenses.length} gastos`),
    columns: [
      { header: "Fecha", key: "date", type: "date", width: 12 },
      { header: "Etapa", key: "stage", width: 20 },
      { header: "Descripción", key: "description", width: 40 },
      { header: "A quién se pagó", key: "supplier", width: 28 },
      { header: "Monto", key: "total", type: "crc", width: 15 },
      { header: "Pagado", key: "paid", type: "crc", width: 15 },
      { header: "Por pagar", key: "pending", type: "crc", width: 15 },
      { header: "Vence", key: "due", type: "date", width: 12 },
      ...partnerCols,
      { header: "Pagó caja chica", key: "cash", type: "crc", width: 15 },
      { header: "Respaldo", key: "receipt", width: 20 },
      { header: "Clave factura electrónica", key: "key", width: 54 },
      { header: "Pedido", key: "order", type: "center", width: 9 },
      { header: "Notas", key: "notes", width: 50 },
      { header: "Registrado por", key: "by", width: 18 },
    ],
    rows: expenses.map((e) => {
      const paid = e.payments.reduce((s, p) => s + p.amount, 0);
      const row: Record<string, unknown> = {
        date: e.date,
        stage: e.stage.name,
        description: e.description,
        supplier: e.supplier ?? "",
        total: e.total,
        paid,
        pending: e.total - paid,
        due: e.dueDate ?? null,
        cash: e.payments.filter((p) => p.source === "CAJA").reduce((s, p) => s + p.amount, 0),
        receipt: RECEIPT[e.receiptType] + (e._count.attachments ? ` (${e._count.attachments} adjunto${e._count.attachments === 1 ? "" : "s"})` : ""),
        key: e.haciendaKey ?? "",
        order: e.order?.number ?? "",
        notes: e.notes ?? "",
        by: e.createdBy.user.name,
      };
      for (const p of partners) row[pkey(p.id)] = e.payments.filter((x) => x.partnerId === p.id).reduce((s, x) => s + x.amount, 0);
      return row;
    }),
    totals: { label: "Total", sum: ["total", "paid", "pending", "cash", ...partners.map((p) => pkey(p.id))] },
  };

  // ─── Pagos ───
  const pagos: Sheet = {
    name: "Pagos",
    title: "Pagos realizados",
    subtitle: sub("cada pago de cada gasto"),
    columns: [
      { header: "Fecha", key: "date", type: "date", width: 12 },
      { header: "Gasto", key: "expense", width: 40 },
      { header: "Etapa", key: "stage", width: 20 },
      { header: "A quién se pagó", key: "supplier", width: 28 },
      { header: "Quién pagó", key: "who", width: 18 },
      { header: "Monto", key: "amount", type: "crc", width: 15 },
    ],
    rows: expenses.flatMap((e) =>
      e.payments.map((p) => ({ date: p.date, expense: e.description, stage: e.stage.name, supplier: e.supplier ?? "", who: p.source === "CAJA" ? "Caja chica" : p.partner?.user.name ?? "", amount: p.amount })),
    ),
    totals: { label: "Total", sum: ["amount"] },
  };

  // ─── Detalle de facturas ───
  const detalle: Sheet = {
    name: "Detalle de facturas",
    title: "Detalle por línea",
    subtitle: sub("líneas leídas de facturas electrónicas, recibos y compras de pedidos"),
    columns: [
      { header: "Fecha", key: "date", type: "date", width: 12 },
      { header: "Gasto", key: "expense", width: 34 },
      { header: "A quién se pagó", key: "supplier", width: 26 },
      { header: "Detalle", key: "description", width: 40 },
      { header: "Cantidad", key: "quantity", type: "num", width: 10 },
      { header: "Precio unitario", key: "unitPrice", type: "crc", width: 15 },
      { header: "Total línea", key: "total", type: "crc", width: 15 },
    ],
    rows: expenses.flatMap((e) => e.lines.map((l) => ({ date: e.date, expense: e.description, supplier: e.supplier ?? "", description: l.description, quantity: l.quantity, unitPrice: l.unitPrice, total: l.total }))),
    totals: { label: "Total", sum: ["total"] },
  };

  // ─── Por etapa ───
  const porEtapa: Sheet = {
    name: "Por etapa",
    title: "Gastado por etapa",
    subtitle: sub("presupuesto contra gastado"),
    columns: [
      { header: "Etapa", key: "stage", width: 24 },
      { header: "Tipo", key: "kind", width: 18 },
      { header: "Gastos", key: "count", type: "center", width: 9 },
      { header: "Presupuesto", key: "budget", type: "crc", width: 15 },
      { header: "Gastado", key: "spent", type: "crc", width: 15 },
      { header: "Pagado", key: "paid", type: "crc", width: 15 },
      { header: "Por pagar", key: "pending", type: "crc", width: 15 },
    ],
    rows: stages.map((s) => {
      const items = expenses.filter((e) => e.stageId === s.id);
      const spent = items.reduce((a, e) => a + e.total, 0);
      const paid = items.reduce((a, e) => a + e.payments.reduce((b, p) => b + p.amount, 0), 0);
      return { stage: s.name, kind: s.kind === "OBRA" ? "Obra" : "Gastos generales", count: items.length, budget: s.budget ?? null, spent, paid, pending: spent - paid };
    }),
    totals: { label: "Total", sum: ["budget", "spent", "paid", "pending"] },
  };

  // ─── Cuentas entre socios ───
  const byId = new Map(ledger.partners.map((l) => [l.partnerId, l]));
  const concept = (label: string, pick: (l: (typeof ledger.partners)[number]) => number) => {
    const row: Record<string, unknown> = { concept: label };
    for (const p of partners) row[pkey(p.id)] = pick(byId.get(p.id)!);
    return row;
  };
  const debtText = debts.length
    ? debts.map((d) => `${firstName(d.from.name)} le debe ${crc(d.amount)} a ${firstName(d.to.name)}`).join("; ")
    : "Las cuentas están parejas";
  const cuentas: Sheet = {
    name: "Cuentas entre socios",
    title: "Cuentas entre socios",
    subtitle: `${debtText}. Caja chica: ${crc(ledger.cash.balance)}. Solo cuenta lo pagado. ${project.name} · generado el ${today}`,
    columns: [{ header: "Concepto", key: "concept", width: 30 }, ...partners.map((p) => ({ header: `${p.user.name} (${p.share ?? 0} %)`, key: pkey(p.id), type: "crc" as const, width: 22 }))],
    rows: [
      concept("Pagos directos", (l) => l.direct),
      concept("Depósitos a la caja chica", (l) => l.deposited),
      concept("Liquidaciones (enviado − recibido)", (l) => l.settled),
      concept("Total puesto", (l) => l.contributed),
      concept("Le toca según su porcentaje", (l) => l.owed),
      concept("Diferencia (+ puso de más)", (l) => l.balance),
    ],
  };

  // ─── Caja chica y transferencias ───
  const movimientos: Sheet = {
    name: "Caja y transferencias",
    title: "Caja chica y transferencias entre socios",
    subtitle: sub(`caja chica: depositado ${crc(ledger.cash.deposited)}, gastado ${crc(ledger.cash.spent)}, saldo ${crc(ledger.cash.balance)}`),
    columns: [
      { header: "Fecha", key: "date", type: "date", width: 12 },
      { header: "Movimiento", key: "kind", width: 28 },
      { header: "De", key: "from", width: 22 },
      { header: "Para", key: "to", width: 22 },
      { header: "Monto", key: "amount", type: "crc", width: 15 },
      { header: "Nota", key: "note", width: 40 },
    ],
    rows: [
      ...deposits.map((d) => ({ date: d.date, kind: "Depósito a la caja chica", from: d.partner.user.name, to: "Caja chica", amount: d.amount, note: d.note ?? "" })),
      ...settlements.map((s) => ({ date: s.date, kind: "Transferencia entre socios", from: s.fromPartner.user.name, to: s.toPartner.user.name, amount: s.amount, note: s.note ?? "" })),
    ].sort((a, b) => a.date.getTime() - b.date.getTime()),
  };

  const buffer = await buildWorkbook([gastos, pagos, detalle, porEtapa, cuentas, movimientos]);
  const filename = `${project.name} - gastos y cuentas ${todayKey()}.xlsx`;
  return { buffer, filename };
}
