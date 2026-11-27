"use client";

import type { UploadResult } from "@/app/api/p/[projectId]/adjuntos/route";

/**
 * Reduce fotos grandes antes de subirlas (datos móviles débiles en obra).
 * Convierte también HEIC de iPhone a JPEG cuando el navegador puede dibujarlo.
 */
export async function compressImage(file: File, maxSide = 1800, quality = 0.82): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;
  if (file.size < 600_000 && /jpe?g|png|webp/.test(file.type)) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", quality));
    if (!blob) return file;
    return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}

export async function uploadReceipt(projectId: string, file: File): Promise<UploadResult> {
  const body = new FormData();
  body.set("file", await compressImage(file));
  const res = await fetch(`/api/p/${projectId}/adjuntos`, { method: "POST", body });
  const json = await res.json().catch(() => ({ error: "No se pudo subir el archivo. Revise la conexión e intente de nuevo." }));
  if (!res.ok) throw new Error(json.error ?? "No se pudo subir el archivo.");
  return json as UploadResult;
}

/** 1234567 → "1.234.567" mientras se escribe */
export function groupDigits(raw: string) {
  const digits = raw.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}
