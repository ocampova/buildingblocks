const TZ = "America/Costa_Rica";

/** ₡1.234.567 (formato de Costa Rica, sin decimales) */
export function crc(amount: number) {
  const n = new Intl.NumberFormat("es-CR", { maximumFractionDigits: 0 }).format(Math.abs(amount)).replace(/[\s  ]/g, ".");
  return (amount < 0 ? "−₡" : "₡") + n;
}

/** 645000 → "645.000" (para valores iniciales de campos de monto) */
export function grouped(amount: number) {
  return crc(amount).replace(/^−?₡/, "");
}

/** Monto escrito por una persona: acepta "12.500", "12500", "₡12 500", "12,500.50" */
export function parseAmount(input: FormDataEntryValue | null | undefined): number | null {
  if (input === null || input === undefined) return null;
  let s = String(input).trim().replace(/[₡\s]/g, "");
  if (!s) return null;
  // Si trae coma decimal al final (12.500,50) o punto decimal (12500.50), se descarta la parte decimal
  s = s.replace(/[.,](\d{1,2})$/, "");
  s = s.replace(/[.,]/g, "");
  if (!/^\d+$/.test(s)) return null;
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : null;
}

export function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

export function firstName(name: string) {
  return name.split(" ")[0] ?? name;
}

const fmt = (opts: Intl.DateTimeFormatOptions, utc = false) => new Intl.DateTimeFormat("es-CR", { timeZone: utc ? "UTC" : TZ, ...opts });

/** Fechas guardadas como @db.Date (medianoche UTC) */
export function dateLabel(d: Date, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" }) {
  return fmt(opts, true).format(d).replace(".", "");
}

/** 27/11/2026 */
export function dateShort(d: Date) {
  return fmt({ day: "2-digit", month: "2-digit", year: "numeric" }, true).format(d);
}

export function relativeDay(d: Date) {
  const diff = Math.round((Date.parse(dateKey(d)) - Date.parse(todayKey())) / 86400000);
  if (diff === 0) return "Hoy";
  if (diff === -1) return "Ayer";
  if (diff === 1) return "Mañana";
  const sameYear = dateKey(d).slice(0, 4) === todayKey().slice(0, 4);
  return dateLabel(d, sameYear ? { day: "numeric", month: "short" } : { day: "numeric", month: "short", year: "numeric" });
}

/** YYYY-MM-DD de una columna @db.Date */
export function dateKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

/** YYYY-MM-DD de hoy en hora de Costa Rica */
export function todayKey() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());
}

export function keyToDate(key: string) {
  return new Date(`${key}T00:00:00.000Z`);
}

export function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

/** "800 unidades", "1 saco", "40 sacos", "3 galones", "6 m³" */
export function quantityLabel(quantity: number, unit: string) {
  const q = Number.isInteger(quantity) ? String(quantity) : String(quantity).replace(".", ",");
  if (quantity === 1 || !/^[a-záéíóúñ]+$/i.test(unit)) return `${q} ${unit}`;
  const plural = /[aeiou]$/i.test(unit) ? unit + "s" : /ón$/i.test(unit) ? unit.replace(/ón$/i, "ones") : /[dlnrj]$/i.test(unit) ? unit + "es" : unit;
  return `${q} ${plural}`;
}
