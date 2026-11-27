import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { z } from "zod";
import { aiProvider, nullable } from "./ai";

export const SupplierSuggestionSchema = z.object({
  name: z.string(),
  kind: z.string(),
  town: z.string().nullable(),
  address: z.string().nullable(),
  phone: z.string().nullable(),
  whatsapp: z.string().nullable(),
  website: z.string().nullable(),
  materials: z.string(),
  why: z.string(),
  sourceUrl: z.string().nullable(),
});
const ResultSchema = z.object({ suppliers: z.array(SupplierSuggestionSchema), note: z.string().nullable() });

export type SupplierSuggestion = z.infer<typeof SupplierSuggestionSchema>;
export type SupplierSearch = { suppliers: SupplierSuggestion[]; note: string | null; sources: { title: string; url: string }[]; provider: "openai" | "anthropic" };

const JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["suppliers", "note"],
  properties: {
    suppliers: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "kind", "town", "address", "phone", "whatsapp", "website", "materials", "why", "sourceUrl"],
        properties: {
          name: { type: "string" },
          kind: { type: "string", description: "Ferretería, depósito de materiales, concretera, distribuidor…" },
          town: nullable("string"),
          address: nullable("string"),
          phone: nullable("string"),
          whatsapp: nullable("string"),
          website: nullable("string"),
          materials: { type: "string", description: "Qué materiales del pedido probablemente tienen" },
          why: { type: "string", description: "Por qué se sugiere, en una frase" },
          sourceUrl: nullable("string"),
        },
      },
    },
    note: nullable("string"),
  },
};

function prompt(location: string, lines: { material: string; quantity: number; unit: string; quality: string | null }[]) {
  const list = lines.map((l) => `- ${l.quantity} ${l.unit} de ${l.material}${l.quality ? ` (${l.quality})` : ""}`).join("\n");
  return `Busca en internet proveedores en Costa Rica a los que se les pueda pedir cotización de estos materiales de construcción, para una obra en ${location}:

${list}

Busca entre 4 y 8 ferreterías, depósitos de materiales, concreteras o distribuidores que estén cerca de ${location} o que entreguen en esa zona. Prefiere los que tengan transporte a la obra y los que vendan varios materiales de la lista.

Para cada uno devuelve:
- name, kind (ferretería, depósito de materiales, concretera, distribuidor…), town (cantón o distrito), address si la encontraste.
- phone y whatsapp: solo si aparecen en una fuente que consultaste, con los 8 dígitos de Costa Rica. Nunca los inventes; si no los encontraste, null.
- website si tiene.
- materials: qué materiales de la lista probablemente tiene.
- why: una frase de por qué lo sugieres (cercanía, transporte, variedad, precios conocidos…).
- sourceUrl: la página donde encontraste la información.

En note, una advertencia corta si algo es dudoso (por ejemplo, si no encontraste proveedores cerca), o null. Escribe todo en español.`;
}

/** Normaliza un teléfono de Costa Rica a 8 dígitos, o null si no parece válido. */
export function crPhone(raw: string | null): string | null {
  if (!raw) return null;
  const d = raw.replace(/\D/g, "").replace(/^506(?=\d{8}$)/, "");
  return /^[245678]\d{7}$/.test(d) ? d : null;
}

/** Busca proveedores con IA y búsqueda web. Devuelve null si no hay clave o si falla. */
export async function searchSuppliers(location: string, lines: Parameters<typeof prompt>[1]): Promise<SupplierSearch | null> {
  const provider = aiProvider();
  if (!provider) return null;
  try {
    const got = provider === "openai" ? await withOpenAI(prompt(location, lines), location) : await withClaude(prompt(location, lines));
    if (!got) return null;
    const parsed = ResultSchema.safeParse(JSON.parse(got.text));
    if (!parsed.success) return null;
    const suppliers = parsed.data.suppliers.map((s) => ({ ...s, phone: crPhone(s.phone), whatsapp: crPhone(s.whatsapp) }));
    return { suppliers, note: parsed.data.note, sources: got.sources, provider };
  } catch (error) {
    if (error instanceof OpenAI.APIError || error instanceof Anthropic.APIError) console.error(`[ia] Búsqueda de proveedores: error ${error.status}: ${error.message}`);
    else console.error("[ia] Búsqueda de proveedores falló", error);
    return null;
  }
}

async function withOpenAI(text: string, location: string) {
  const client = new OpenAI();
  const response = await client.responses.create({
    model: process.env.OPENAI_MODEL || "gpt-5.5",
    tools: [{ type: "web_search", user_location: { type: "approximate", country: "CR", city: location.split(",")[0]?.trim() || null } }],
    input: text,
    text: { format: { type: "json_schema", name: "proveedores", strict: true, schema: JSON_SCHEMA } },
  });
  const sources: { title: string; url: string }[] = [];
  for (const item of response.output) {
    if (item.type !== "message") continue;
    for (const part of item.content) {
      if (part.type !== "output_text") continue;
      for (const a of part.annotations) if (a.type === "url_citation" && !sources.some((s) => s.url === a.url)) sources.push({ title: a.title, url: a.url });
    }
  }
  return response.output_text ? { text: response.output_text, sources } : null;
}

async function withClaude(text: string) {
  const client = new Anthropic();
  const messages: Anthropic.Beta.BetaMessageParam[] = [{ role: "user", content: text }];
  const sources: { title: string; url: string }[] = [];
  // Una búsqueda larga puede pausarse (pause_turn): se reenvía para que el servidor continúe
  for (let i = 0; i < 4; i++) {
    const response = await client.beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 6, user_location: { type: "approximate", country: "CR" } }],
      output_config: { effort: "medium", format: { type: "json_schema", schema: JSON_SCHEMA } },
      messages,
    });
    for (const b of response.content) {
      if (b.type === "web_search_tool_result" && Array.isArray(b.content)) {
        for (const r of b.content) if (r.type === "web_search_result" && !sources.some((s) => s.url === r.url)) sources.push({ title: r.title, url: r.url });
      }
    }
    if (response.stop_reason === "pause_turn") {
      messages.push({ role: "assistant", content: response.content });
      continue;
    }
    if (response.stop_reason !== "end_turn") return null;
    const out = [...response.content].reverse().find((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")?.text;
    return out ? { text: out, sources } : null;
  }
  return null;
}
