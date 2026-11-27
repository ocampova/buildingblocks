import "server-only";
import Anthropic from "@anthropic-ai/sdk";
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

const JSON_SCHEMA = {
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
} as const;

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

export function aiAvailable() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

/** Devuelve null si no hay clave configurada, si el modelo no pudo leerlo o si la respuesta no es válida. */
export async function readReceipt(file: { data: Buffer; mime: string }): Promise<ReceiptGuess | null> {
  if (!aiAvailable()) return null;
  const client = new Anthropic();
  const b64 = file.data.toString("base64");
  const source: Anthropic.Beta.BetaContentBlockParam =
    file.mime === "application/pdf"
      ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: b64 } }
      : {
          type: "image",
          source: { type: "base64", media_type: file.mime as "image/jpeg" | "image/png" | "image/webp" | "image/gif", data: b64 },
        };

  try {
    const response = await client.beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 4000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low", format: { type: "json_schema", schema: JSON_SCHEMA } },
      messages: [{ role: "user", content: [source, { type: "text", text: PROMPT }] }],
    });
    if (response.stop_reason === "refusal" || response.stop_reason === "max_tokens") return null;
    const text = response.content.find((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")?.text;
    if (!text) return null;
    const parsed = ReceiptSchema.safeParse(JSON.parse(text));
    return parsed.success ? parsed.data : null;
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) console.error("[ia] ANTHROPIC_API_KEY no es válida");
    else if (error instanceof Anthropic.RateLimitError) console.error("[ia] Límite de uso alcanzado; se llena a mano");
    else if (error instanceof Anthropic.APIError) console.error(`[ia] Error ${error.status}: ${error.message}`);
    else console.error("[ia] No se pudo leer el recibo", error);
    return null;
  }
}
