import "server-only";
import { z } from "zod";
import { extract, nullable, type AiFile } from "./ai";

// ─── Lista de materiales del constructor ─────────────────────────────────────

const ListSchema = z.object({
  lines: z.array(z.object({ material: z.string(), quantity: z.number().nullable(), unit: z.string().nullable(), quality: z.string().nullable() })),
});
export type ListGuess = z.infer<typeof ListSchema>;

const LIST_JSON = {
  type: "object",
  additionalProperties: false,
  required: ["lines"],
  properties: {
    lines: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["material", "quantity", "unit", "quality"],
        properties: {
          material: { type: "string" },
          quantity: nullable("number"),
          unit: nullable("string"),
          quality: nullable("string"),
        },
      },
    },
  },
};

const LIST_PROMPT = `Esta es una lista de materiales de construcción que un constructor pide para una obra en Costa Rica. Puede ser una foto de una lista escrita a mano, una nota del celular o un PDF.

Devuelve una línea por material:
- material: el nombre del material como lo diría una ferretería en Costa Rica (por ejemplo "Cemento gris 50 kg", "Varilla #3 grado 40", "Block de 15 cm").
- quantity: la cantidad como número. null si no se ve.
- unit: la unidad (saco, unidad, metro, m³, kg, galón, rollo, lámina…). null si no se ve.
- quality: la marca, calidad o especificación que pide (por ejemplo "Holcim", "grado 40", "clase A"). null si no la pide.

No inventes materiales ni cantidades. Si una línea no se lee, déjala fuera.`;

export function readMaterialList(file: AiFile) {
  return extract({ files: [file], prompt: LIST_PROMPT, jsonSchema: LIST_JSON, schema: ListSchema, maxTokens: 6000 });
}

// ─── Cotización de un proveedor, alineada con las líneas del pedido ─────────

const QuoteSchema = z.object({
  supplier: z.string().nullable(),
  date: z.string().nullable(),
  currency: z.enum(["CRC", "USD"]),
  exchangeRate: z.number().nullable(),
  deliveryDays: z.number().nullable(),
  transport: z.number().nullable(),
  credit: z.string().nullable(),
  lines: z.array(
    z.object({
      orderLine: z.number().nullable(),
      description: z.string(),
      brand: z.string().nullable(),
      quantity: z.number().nullable(),
      unit: z.string().nullable(),
      unitPrice: z.number().nullable(),
      total: z.number().nullable(),
      quality: z.enum(["CUMPLE", "DISTINTA", "NO_CLARO"]),
      qualityNote: z.string().nullable(),
    }),
  ),
});
export type QuoteGuess = z.infer<typeof QuoteSchema>;

const QUOTE_JSON = {
  type: "object",
  additionalProperties: false,
  required: ["supplier", "date", "currency", "exchangeRate", "deliveryDays", "transport", "credit", "lines"],
  properties: {
    supplier: nullable("string"),
    date: nullable("string", { description: "YYYY-MM-DD" }),
    currency: { type: "string", enum: ["CRC", "USD"] },
    exchangeRate: nullable("number"),
    deliveryDays: nullable("number"),
    transport: nullable("number"),
    credit: nullable("string"),
    lines: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["orderLine", "description", "brand", "quantity", "unit", "unitPrice", "total", "quality", "qualityNote"],
        properties: {
          orderLine: nullable("number"),
          description: { type: "string" },
          brand: nullable("string"),
          quantity: nullable("number"),
          unit: nullable("string"),
          unitPrice: nullable("number"),
          total: nullable("number"),
          quality: { type: "string", enum: ["CUMPLE", "DISTINTA", "NO_CLARO"] },
          qualityNote: nullable("string"),
        },
      },
    },
  },
};

export function readQuote(file: AiFile, order: { material: string; quantity: number; unit: string; quality: string | null }[]) {
  const list = order.map((l, i) => `${i + 1}. ${l.quantity} ${l.unit} de ${l.material}${l.quality ? ` (calidad pedida: ${l.quality})` : ""}`).join("\n");
  const prompt = `Este documento es una cotización de un proveedor de materiales en Costa Rica (foto, captura de WhatsApp o PDF). Responde a este pedido:

${list}

Extrae:
- supplier: el nombre del proveedor. null si no se ve.
- date: fecha de la cotización (YYYY-MM-DD). null si no se ve.
- currency: CRC salvo que esté claramente en dólares. exchangeRate: el tipo de cambio si lo trae, si no null.
- deliveryDays: en cuántos días entregan, si lo dice. null si no.
- transport: costo del transporte o flete como número (0 si dice que es gratis). null si no lo menciona.
- credit: condiciones de crédito o pago si las menciona (por ejemplo "30 días"). null si no.
- lines: una por cada línea cotizada, con:
  - orderLine: el número de la línea del pedido a la que corresponde (1, 2, 3…), o null si no corresponde a ninguna.
  - description, brand (marca si la dice), quantity, unit.
  - unitPrice y total como números sin símbolos ni separadores de miles (₡6.500,00 es 6500). Si solo trae el total, calcula el unitario dividiendo entre la cantidad.
  - quality: CUMPLE si la marca o especificación coincide con la pedida (o si no se pidió ninguna), DISTINTA si es claramente otra marca o especificación, NO_CLARO si no se puede saber.
  - qualityNote: si es DISTINTA o NO_CLARO, una frase corta explicando por qué (por ejemplo "Cotiza cemento Cemex, se pidió Holcim"). null si cumple.

No inventes precios: si una línea no tiene precio, unitPrice y total son null.`;
  return extract({ files: [file], prompt, jsonSchema: QUOTE_JSON, schema: QuoteSchema, maxTokens: 12000, effort: "medium" });
}
