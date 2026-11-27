import { XMLParser } from "fast-xml-parser";

/** Lo que se extrae de un comprobante electrónico de Hacienda (factura o tiquete, v4.3 y v4.4). */
export type HaciendaDoc = {
  kind: "FACTURA" | "TIQUETE" | "NOTA_CREDITO" | "NOTA_DEBITO";
  key: string;
  date: string; // YYYY-MM-DD
  supplier: string;
  supplierId?: string;
  currency: string;
  exchangeRate?: number;
  /** Total del comprobante en su moneda */
  total: number;
  lines: { description: string; quantity: number; unitPrice: number; total: number }[];
};

const ROOTS: Record<string, HaciendaDoc["kind"]> = {
  FacturaElectronica: "FACTURA",
  FacturaElectronicaCompra: "FACTURA",
  TiqueteElectronico: "TIQUETE",
  NotaCreditoElectronica: "NOTA_CREDITO",
  NotaDebitoElectronica: "NOTA_DEBITO",
};

const num = (v: unknown) => {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};
const str = (v: unknown) => (v === undefined || v === null ? "" : String(v).trim());
const asArray = <T>(v: T | T[] | undefined): T[] => (v === undefined ? [] : Array.isArray(v) ? v : [v]);

/** Nodo del XML ya convertido: cada hijo es otro nodo, un texto o una lista. */
type XmlNode = { [key: string]: XmlNode & XmlNode[] & string };

/** Devuelve null si el XML no es un comprobante de Hacienda (por ejemplo, el mensaje de respuesta). */
export function parseHaciendaXml(xml: string): HaciendaDoc | null {
  const parser = new XMLParser({ ignoreAttributes: true, removeNSPrefix: true, parseTagValue: false, trimValues: true });
  let doc: Record<string, unknown>;
  try {
    doc = parser.parse(xml);
  } catch {
    return null;
  }
  const rootName = Object.keys(doc).find((k) => k in ROOTS);
  if (!rootName) return null;
  const root = doc[rootName] as XmlNode;
  const key = str(root.Clave);
  if (!/^\d{50}$/.test(key)) return null;

  const resumen = root.ResumenFactura ?? {};
  const moneda = resumen.CodigoTipoMoneda ?? {};
  const currency = str(moneda.CodigoMoneda) || str(resumen.CodigoMoneda) || "CRC";
  const rate = num(moneda.TipoCambio ?? resumen.TipoCambio);

  const lines = asArray<XmlNode>(root.DetalleServicio?.LineaDetalle).map((l) => ({
    description: str(l.Detalle),
    quantity: num(l.Cantidad),
    unitPrice: num(l.PrecioUnitario),
    total: num(l.MontoTotalLinea),
  }));

  return {
    kind: ROOTS[rootName],
    key,
    date: str(root.FechaEmision).slice(0, 10),
    supplier: str(root.Emisor?.NombreComercial) || str(root.Emisor?.Nombre),
    supplierId: str(root.Emisor?.Identificacion?.Numero) || undefined,
    currency,
    exchangeRate: rate > 0 ? rate : undefined,
    total: num(resumen.TotalComprobante),
    lines,
  };
}

/** Total en colones enteros. */
export function totalInColones(d: Pick<HaciendaDoc, "total" | "currency" | "exchangeRate">) {
  if (d.currency === "CRC") return Math.round(d.total);
  return Math.round(d.total * (d.exchangeRate ?? 0));
}
