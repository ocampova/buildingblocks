import "server-only";
import ExcelJS from "exceljs";
import { NextResponse } from "next/server";

export type Column = { header: string; key: string; width?: number; type?: "text" | "crc" | "date" | "num" | "center" };
export type Sheet = {
  name: string;
  title: string;
  subtitle?: string;
  columns: Column[];
  rows: Record<string, unknown>[];
  /** Fila de totales: etiqueta en la primera columna y SUMA en las columnas indicadas */
  totals?: { label: string; sum: string[] };
};

const BRAND = "FF173A6E";
const FORMATS: Record<string, string> = { crc: '"₡"#,##0', date: "dd/mm/yyyy", num: "#,##0.##" };

/** Libro de Excel con membrete de Obra: título, subtítulo, encabezados azules, fila fija, filtros y totales con fórmula. */
export async function buildWorkbook(sheets: Sheet[], extra?: (wb: ExcelJS.Workbook) => void) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Obra";
  wb.created = new Date();
  extra?.(wb);
  for (const sh of sheets) {
    const ws = wb.addWorksheet(sh.name.slice(0, 31), { views: [{ state: "frozen", ySplit: 4 }] });
    ws.columns = sh.columns.map((c) => ({ key: c.key, width: c.width ?? Math.max(12, c.header.length + 2) }));
    ws.getCell("A1").value = sh.title;
    ws.getCell("A1").font = { bold: true, size: 14, color: { argb: BRAND } };
    ws.getCell("A2").value = sh.subtitle ?? "";
    ws.getCell("A2").font = { size: 10, color: { argb: "FF5F6661" } };
    const header = ws.getRow(4);
    sh.columns.forEach((c, i) => {
      const cell = header.getCell(i + 1);
      cell.value = c.header;
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BRAND } };
      cell.alignment = { vertical: "middle", horizontal: c.type === "center" ? "center" : c.type && c.type !== "text" ? "right" : "left", wrapText: true };
    });
    header.height = 24;
    for (const r of sh.rows) {
      const row = ws.addRow(r);
      sh.columns.forEach((c, i) => {
        const cell = row.getCell(i + 1);
        if (c.type && FORMATS[c.type]) cell.numFmt = FORMATS[c.type];
        if (c.type === "center") cell.alignment = { horizontal: "center" };
        if (!c.type || c.type === "text") cell.alignment = { wrapText: true, vertical: "top" };
      });
    }
    const first = 5;
    const last = 4 + sh.rows.length;
    if (sh.totals && sh.rows.length > 0) {
      const row = ws.addRow({});
      row.getCell(1).value = sh.totals.label;
      sh.columns.forEach((c, i) => {
        const cell = row.getCell(i + 1);
        if (sh.totals!.sum.includes(c.key)) {
          const col = ws.getColumn(i + 1).letter;
          const result = sh.rows.reduce((s, r) => s + (Number(r[c.key]) || 0), 0);
          cell.value = { formula: `SUM(${col}${first}:${col}${last})`, result };
        }
        if (c.type && FORMATS[c.type]) cell.numFmt = FORMATS[c.type];
        cell.font = { bold: true };
        cell.border = { top: { style: "thin", color: { argb: "FFC3C2B8" } } };
      });
    }
    ws.autoFilter = { from: { row: 4, column: 1 }, to: { row: Math.max(4, last), column: sh.columns.length } };
  }
  return Buffer.from(await wb.xlsx.writeBuffer());
}

export function xlsxResponse(buf: Buffer, filename: string) {
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename.replace(/[^\w.\- ]/g, "_")}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Cache-Control": "private, no-store",
    },
  });
}
