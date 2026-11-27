import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { z } from "zod";

export function aiAvailable() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export type AiFile = { data: Buffer; mime: string };
type ImageMime = "image/jpeg" | "image/png" | "image/webp" | "image/gif";

function block(file: AiFile): Anthropic.Beta.BetaContentBlockParam {
  const data = file.data.toString("base64");
  if (file.mime === "application/pdf") return { type: "document", source: { type: "base64", media_type: "application/pdf", data } };
  return { type: "image", source: { type: "base64", media_type: file.mime as ImageMime, data } };
}

/**
 * Pide a Claude que extraiga datos de uno o varios documentos con salida JSON estructurada.
 * Devuelve null si no hay clave, si el modelo se niega o si la respuesta no es válida:
 * en ese caso la persona llena los datos a mano.
 */
export async function extract<T>(opts: { files: AiFile[]; prompt: string; jsonSchema: Record<string, unknown>; schema: z.ZodType<T>; maxTokens?: number; effort?: "low" | "medium" }): Promise<T | null> {
  if (!aiAvailable()) return null;
  const client = new Anthropic();
  try {
    const response = await client.beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: opts.maxTokens ?? 8000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: opts.effort ?? "low", format: { type: "json_schema", schema: opts.jsonSchema } },
      messages: [{ role: "user", content: [...opts.files.map(block), { type: "text", text: opts.prompt }] }],
    });
    if (response.stop_reason === "refusal" || response.stop_reason === "max_tokens") return null;
    const text = response.content.find((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")?.text;
    if (!text) return null;
    const parsed = opts.schema.safeParse(JSON.parse(text));
    return parsed.success ? parsed.data : null;
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) console.error("[ia] ANTHROPIC_API_KEY no es válida");
    else if (error instanceof Anthropic.RateLimitError) console.error("[ia] Límite de uso alcanzado; se llena a mano");
    else if (error instanceof Anthropic.APIError) console.error(`[ia] Error ${error.status}: ${error.message}`);
    else console.error("[ia] No se pudo leer el documento", error);
    return null;
  }
}

/** Tipos JSON Schema que aceptan null */
export const nullable = (type: string, extra: Record<string, unknown> = {}) => ({ type: [type, "null"], ...extra });
