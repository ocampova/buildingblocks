import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import type { z } from "zod";

/**
 * Lectura de documentos con IA. Usa OpenAI si existe OPENAI_API_KEY; si no, Claude
 * (ANTHROPIC_API_KEY). Sin ninguna de las dos, la persona llena los datos a mano.
 */
export function aiProvider(): "openai" | "anthropic" | null {
  if (process.env.OPENAI_API_KEY) return "openai";
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  return null;
}

export function aiAvailable() {
  return aiProvider() !== null;
}

export type AiFile = { data: Buffer; mime: string };
type ImageMime = "image/jpeg" | "image/png" | "image/webp" | "image/gif";

type ExtractOpts<T> = {
  files: AiFile[];
  prompt: string;
  jsonSchema: Record<string, unknown>;
  schema: z.ZodType<T>;
  maxTokens?: number;
  effort?: "low" | "medium";
};

/**
 * Extrae datos de uno o varios documentos con salida JSON estructurada.
 * Devuelve null si no hay clave, si el modelo se niega o si la respuesta no es válida.
 */
export async function extract<T>(opts: ExtractOpts<T>): Promise<T | null> {
  const provider = aiProvider();
  if (!provider) return null;
  try {
    const text = provider === "openai" ? await withOpenAI(opts) : await withClaude(opts);
    if (!text) return null;
    const parsed = opts.schema.safeParse(JSON.parse(text));
    return parsed.success ? parsed.data : null;
  } catch (error) {
    if (error instanceof OpenAI.AuthenticationError || error instanceof Anthropic.AuthenticationError) console.error(`[ia] La clave de ${provider} no es válida`);
    else if (error instanceof OpenAI.RateLimitError || error instanceof Anthropic.RateLimitError) console.error("[ia] Límite de uso alcanzado; se llena a mano");
    else if (error instanceof OpenAI.APIError || error instanceof Anthropic.APIError) console.error(`[ia] Error ${error.status}: ${error.message}`);
    else console.error("[ia] No se pudo leer el documento", error);
    return null;
  }
}

async function withOpenAI<T>(opts: ExtractOpts<T>): Promise<string | null> {
  const client = new OpenAI();
  const parts: OpenAI.Chat.Completions.ChatCompletionContentPart[] = opts.files.map((f, i) => {
    const url = `data:${f.mime};base64,${f.data.toString("base64")}`;
    return f.mime === "application/pdf" ? { type: "file", file: { filename: `documento-${i + 1}.pdf`, file_data: url } } : { type: "image_url", image_url: { url, detail: "high" } };
  });
  const response = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-5.5",
    messages: [{ role: "user", content: [...parts, { type: "text", text: opts.prompt }] }],
    response_format: { type: "json_schema", json_schema: { name: "extraccion", strict: true, schema: opts.jsonSchema } },
  });
  const message = response.choices[0]?.message;
  if (!message || message.refusal || response.choices[0].finish_reason === "length") return null;
  return message.content;
}

async function withClaude<T>(opts: ExtractOpts<T>): Promise<string | null> {
  const client = new Anthropic();
  const block = (file: AiFile): Anthropic.Beta.BetaContentBlockParam => {
    const data = file.data.toString("base64");
    if (file.mime === "application/pdf") return { type: "document", source: { type: "base64", media_type: "application/pdf", data } };
    return { type: "image", source: { type: "base64", media_type: file.mime as ImageMime, data } };
  };
  const response = await client.beta.messages.create({
    model: "claude-opus-5-5",
    max_tokens: opts.maxTokens ?? 8000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: opts.effort ?? "low", format: { type: "json_schema", schema: opts.jsonSchema } },
    messages: [{ role: "user", content: [...opts.files.map(block), { type: "text", text: opts.prompt }] }],
  });
  if (response.stop_reason === "refusal" || response.stop_reason === "max_tokens") return null;
  return response.content.find((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")?.text ?? null;
}

/** Tipos JSON Schema que aceptan null */
export const nullable = (type: string, extra: Record<string, unknown> = {}) => ({ type: [type, "null"], ...extra });
