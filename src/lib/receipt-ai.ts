import "server-only";
import { extract, type AiFile } from "./ai";
import { z } from "zod";

/** Lo que la IA propone a partir de la foto o el PDF de un recibo. Siempre lo confirma una persona. */
export const ReceiptSchema = z.object({
  kind: z.enum(["FACTURA", "TIQUETE", "NOTA", "COMPROBANTE", "OTRO"]),
  supplier: z.string().nullable(),
  date: z.string().nullable(),
  currency: z.enum(["CRC", "USD"]),
  total: z.number().nullable(),
  description: z.string().nullable(),
  lines: z.array(
    z.object({
      description: z.string(),
      quantity: z.number().nullable(),
      unitPrice: z.number().nullable(),
      total: z.number().nullable(),
    }),
  ),
});
export type ReceiptGuess = z.infer<typeof ReceiptSchema>;

const JSON_SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["kind", "supplier", "date", "currency", "total", "description", "lines"],
  properties: {
    kind: { type: "string", enum: ["FACTURA", "TIQUETE", "NOTA", "COMPROBANTE", "OTRO"] },
    supplier: { type: ["string", "null"] },
    date: { type: ["string", "null"], description: "YYYY-MM-DD" },
    currency: { type: "string", enum: ["CRC", "USD"] },
    total: { type: ["number", "null"] },
    description: { type: ["string", "null"] },
    lines: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["description", "quantity", "unitPrice", "total"],
        properties: {
          description: { type: "string" },
          quantity: { type: ["number", "null"] },
          unitPrice: { type: ["number", "null"] },
          total: { type: ["number", "null"] },
        },
      },
    },
  },
};

const PROMPT = `Este documento es un respaldo de un gasto de una construcción en Costa Rica: puede ser una factura, un tiquete de ferretería, una nota escrita a mano (vagonetas, horas de maquinaria, mano de obra) o un comprobante de SINPE Móvil o transferencia.

Extrae:
- kind: FACTURA (factura electrónica o factura formal), TIQUETE (tiquete de caja o recibo simple), NOTA (nota o conteo a mano), COMPROBANTE (SINPE o transferencia) u OTRO.
- supplier: a quién se le pagó (comercio, persona o destinatario del SINPE). null si no se ve.
- date: fecha del documento en formato YYYY-MM-DD. null si no se ve.
- currency: CRC salvo que el documento esté claramente en dólares.
- total: el total pagado, como número sin símbolos ni separadores de miles (₡12.500,00 es 12500). null si no se ve.
- description: una descripción corta en español de lo que se compró o pagó (por ejemplo "Cemento y varilla" o "3 viajes de lastre").
- lines: las líneas de detalle que se lean con claridad; lista vacía si no hay.

No inventes datos: si algo no se lee, usa null.`;

export { aiAvailable } from "./ai";

/** Devuelve null si no hay clave configurada, si el modelo no pudo leerlo o si la respuesta no es válida. */
export async function readReceipt(file: AiFile): Promise<ReceiptGuess | null> {
  return extract({ files: [file], prompt: PROMPT, jsonSchema: JSON_SCHEMA, schema: ReceiptSchema, maxTokens: 4000 });
}
