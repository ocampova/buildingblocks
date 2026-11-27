/**
 * Datos de demostración (ficticios) para probar la app en local:
 *   npm run demo
 * Borra la base local. Nunca lo corra contra la base de producción.
 */
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { DEFAULT_STAGES } from "../src/lib/stages";

const prisma = new PrismaClient();
const d = (s: string) => new Date(`${s}T00:00:00.000Z`);

async function main() {
  if (process.env.RAILWAY_ENVIRONMENT || process.env.NODE_ENV === "production") throw new Error("No corra la demostración en producción.");
  await prisma.$transaction([prisma.attachment.deleteMany(), prisma.project.deleteMany(), prisma.authToken.deleteMany(), prisma.pushSubscription.deleteMany(), prisma.user.deleteMany()]);
  const hash = await bcrypt.hash("demo1234", 10);
  const [a, b, admin, builder] = await Promise.all([
    prisma.user.create({ data: { name: "Andrés Mora", email: "andres@demo.cr", passwordHash: hash } }),
    prisma.user.create({ data: { name: "Daniel Mora", email: "daniel@demo.cr", passwordHash: hash } }),
    prisma.user.create({ data: { name: "Laura Vargas", email: "laura@demo.cr", passwordHash: hash } }),
    prisma.user.create({ data: { name: "Rafael Solís", email: "rafael@demo.cr", passwordHash: hash } }),
  ]);
  const p = await prisma.project.create({
    data: { name: "Apartamentos Las Brisas", cashMinimum: 300_000, stages: { create: DEFAULT_STAGES.map((s, i) => ({ name: s.name, kind: s.kind, position: i })) } },
    include: { stages: true },
  });
  const stage = (n: string) => p.stages.find((s) => s.name === n)!.id;
  const [ma, mb, ml] = await Promise.all([
    prisma.member.create({ data: { projectId: p.id, userId: a.id, role: "SOCIO", share: 50, color: 0 } }),
    prisma.member.create({ data: { projectId: p.id, userId: b.id, role: "SOCIO", share: 50, color: 1 } }),
    prisma.member.create({ data: { projectId: p.id, userId: admin.id, role: "ADMINISTRACION" } }),
    prisma.member.create({ data: { projectId: p.id, userId: builder.id, role: "CONSTRUCTOR" } }),
  ]);
  await prisma.stage.update({ where: { id: stage("Movimiento de tierra") }, data: { budget: 4_500_000 } });
  await prisma.stage.update({ where: { id: stage("Cimentaciones") }, data: { budget: 9_000_000 } });

  type P = { amount: number; source: "SOCIO" | "CAJA"; partnerId?: string };
  const exp = async (date: string, st: string, description: string, total: number, supplier: string | null, payments: P[], receiptType: "FACTURA" | "TIQUETE" | "NOTA" | "COMPROBANTE" | "NINGUNO", dueDate?: string) =>
    prisma.expense.create({
      data: {
        projectId: p.id,
        stageId: stage(st),
        date: d(date),
        description,
        total,
        supplier,
        receiptType,
        dueDate: dueDate ? d(dueDate) : null,
        createdById: ml.id,
        payments: { create: payments.map((x) => ({ amount: x.amount, source: x.source, partnerId: x.partnerId ?? null, date: d(date) })) },
      },
    });

  await exp("2026-03-14", "Gastos generales", "Terreno (compra)", 38_000_000, "Notaría", [{ amount: 19_000_000, source: "SOCIO", partnerId: ma.id }, { amount: 19_000_000, source: "SOCIO", partnerId: mb.id }], "COMPROBANTE");
  await exp("2026-07-02", "Gastos generales", "Planos y dirección técnica (primer tracto)", 6_200_000, "Arquitecta", [{ amount: 3_800_000, source: "SOCIO", partnerId: ma.id }, { amount: 2_400_000, source: "SOCIO", partnerId: mb.id }], "FACTURA");
  await exp("2026-10-20", "Gastos generales", "Permiso de construcción municipal", 1_430_000, "Municipalidad", [{ amount: 1_430_000, source: "SOCIO", partnerId: ma.id }], "COMPROBANTE");
  await exp("2026-11-03", "Movimiento de tierra", "Retroexcavadora, 22 horas", 1_320_000, "Maquinaria del Valle", [{ amount: 1_320_000, source: "SOCIO", partnerId: mb.id }], "NOTA");
  await exp("2026-11-06", "Movimiento de tierra", "Vagonetas de lastre, 9 viajes", 765_000, "Transportes Hidalgo", [{ amount: 765_000, source: "SOCIO", partnerId: ma.id }], "NOTA");
  await exp("2026-11-12", "Gastos generales", "Póliza de riesgos del trabajo", 412_500, "INS", [], "FACTURA", "2026-12-05");
  await exp("2026-11-18", "Cimentaciones", "Cemento y varilla para zapatas", 1_847_300, "Depósito El Roble", [{ amount: 1_847_300, source: "SOCIO", partnerId: mb.id }], "FACTURA");
  await exp("2026-11-21", "Cimentaciones", "Mano de obra, semana 1", 980_000, "Rafael Solís", [{ amount: 980_000, source: "SOCIO", partnerId: ma.id }], "COMPROBANTE");
  await exp("2026-11-24", "Cimentaciones", "Clavos, alambre negro y formaleta", 86_450, "Ferretería La Esquina", [{ amount: 86_450, source: "CAJA" }], "TIQUETE");
  await exp("2026-11-25", "Cimentaciones", "Concreto premezclado 6 m³", 1_290_000, "Concretera Central", [{ amount: 645_000, source: "SOCIO", partnerId: ma.id }], "FACTURA", "2026-11-30");
  await exp("2026-11-26", "Gastos generales", "CCSS, cuota de noviembre", 318_200, "CCSS", [], "NINGUNO", "2026-11-28");
  await exp("2026-11-27", "Cimentaciones", "Almuerzos del personal", 42_000, null, [{ amount: 42_000, source: "CAJA" }], "NINGUNO");

  await prisma.cashDeposit.createMany({
    data: [
      { projectId: p.id, partnerId: ma.id, date: d("2026-11-01"), amount: 250_000 },
      { projectId: p.id, partnerId: mb.id, date: d("2026-11-01"), amount: 250_000 },
    ],
  });
  // Pedidos de materiales (ficticios)
  const mr = await prisma.member.findFirstOrThrow({ where: { projectId: p.id, role: "CONSTRUCTOR" } });
  const mk = async (number: number, title: string, neededBy: string, st: string, status: "POR_COTIZAR" | "COTIZADO", lines: [string, number, string, string | null][]) =>
    prisma.order.create({
      data: { projectId: p.id, number, title, neededBy: d(neededBy), stageId: stage(st), status, createdById: mr.id, lines: { create: lines.map(([material, quantity, unit, quality], i) => ({ position: i, material, quantity, unit, quality })) } },
      include: { lines: { orderBy: { position: "asc" } } },
    });
  await prisma.project.update({ where: { id: p.id }, data: { nextOrderNumber: 4 } });
  await mk(1, "Bloques para paredes del primer piso", "2026-12-08", "Mampostería", "POR_COTIZAR", [
    ["Block de 15 cm", 800, "unidad", "Clase A"],
    ["Arena de tajo", 6, "m³", null],
    ["Cemento gris 50 kg", 40, "saco", "Holcim"],
  ]);
  const o2 = await mk(2, "Columnas planta baja", "2026-11-30", "Estructura", "COTIZADO", [
    ["Varilla #4 grado 40", 120, "varilla", "Grado 40"],
    ["Varilla #3 grado 40", 80, "varilla", "Grado 40"],
    ["Alambre negro", 3, "rollo", null],
    ["Cemento gris 50 kg", 30, "saco", "Holcim"],
  ]);
  await mk(3, "Tubería de desagüe", "2026-12-15", "Fontanería", "POR_COTIZAR", [["Tubo PVC 4 pulgadas SDR 41", 12, "unidad", null]]);
  const supA = await prisma.supplier.create({ data: { projectId: p.id, name: "Depósito El Roble" } });
  const supB = await prisma.supplier.create({ data: { projectId: p.id, name: "Ferretería La Esquina" } });
  const [v4, v3, al, ce] = o2.lines;
  await prisma.quote.create({
    data: {
      orderId: o2.id, supplierId: supA.id, date: d("2026-11-26"), deliveryDays: 2, transport: 18000, credit: "Contado",
      lines: { create: [
        { orderLineId: v4.id, description: v4.material, quantity: 120, unit: "varilla", unitPrice: 4650, total: 558000, quality: "CUMPLE", brand: "ArcelorMittal" },
        { orderLineId: v3.id, description: v3.material, quantity: 80, unit: "varilla", unitPrice: 2890, total: 231200, quality: "CUMPLE", brand: "ArcelorMittal" },
        { orderLineId: al.id, description: al.material, quantity: 3, unit: "rollo", unitPrice: 21500, total: 64500, quality: "CUMPLE" },
        { orderLineId: ce.id, description: ce.material, quantity: 30, unit: "saco", unitPrice: 6450, total: 193500, quality: "CUMPLE", brand: "Holcim" },
      ] },
    },
  });
  await prisma.quote.create({
    data: {
      orderId: o2.id, supplierId: supB.id, date: d("2026-11-27"), deliveryDays: 1, transport: 0, credit: "15 días",
      lines: { create: [
        { orderLineId: v4.id, description: v4.material, quantity: 120, unit: "varilla", unitPrice: 4480, total: 537600, quality: "CUMPLE" },
        { orderLineId: v3.id, description: v3.material, quantity: 80, unit: "varilla", unitPrice: 2950, total: 236000, quality: "CUMPLE" },
        { orderLineId: ce.id, description: ce.material, quantity: 30, unit: "saco", unitPrice: 6200, total: 186000, quality: "DISTINTA", brand: "Cemex", qualityNote: "Cotiza Cemex; se pidió Holcim" },
      ] },
    },
  });

  console.log(`Demo lista. Proyecto ${p.id}. Entre con andres@demo.cr / demo1234 (también daniel@, laura@, rafael@).`);
}

main().finally(() => prisma.$disconnect());
