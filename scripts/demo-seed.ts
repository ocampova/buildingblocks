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
  await prisma.$transaction([prisma.attachment.deleteMany(), prisma.project.deleteMany(), prisma.authToken.deleteMany(), prisma.user.deleteMany()]);
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
  console.log(`Demo lista. Proyecto ${p.id}. Entre con andres@demo.cr / demo1234 (también daniel@, laura@, rafael@).`);
}

main().finally(() => prisma.$disconnect());
