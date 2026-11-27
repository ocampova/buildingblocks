import type { StageKind } from "@prisma/client";

/** Etapas con las que arranca cada proyecto. Se pueden renombrar, quitar o agregar. */
export const DEFAULT_STAGES: { name: string; kind: StageKind }[] = [
  { name: "Movimiento de tierra", kind: "OBRA" },
  { name: "Cimentaciones", kind: "OBRA" },
  { name: "Estructura", kind: "OBRA" },
  { name: "Mampostería", kind: "OBRA" },
  { name: "Techos", kind: "OBRA" },
  { name: "Electricidad", kind: "OBRA" },
  { name: "Fontanería", kind: "OBRA" },
  { name: "Acabados", kind: "OBRA" },
  { name: "Gastos generales", kind: "GENERAL" },
];
