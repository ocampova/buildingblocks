import { test } from "node:test";
import assert from "node:assert/strict";
import { parseHaciendaXml, totalInColones } from "./hacienda";

// Comprobante de ejemplo (ficticio), con la estructura de Hacienda v4.4
const KEY = "50627112600310123456700100001010000000123199999999";
const factura = `<?xml version="1.0" encoding="utf-8"?>
<FacturaElectronica xmlns="https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.4/facturaElectronica">
  <Clave>${KEY}</Clave>
  <NumeroConsecutivo>00100001010000000123</NumeroConsecutivo>
  <FechaEmision>2026-11-26T10:15:00-06:00</FechaEmision>
  <Emisor>
    <Nombre>DEPOSITO DE MATERIALES EJEMPLO S.A.</Nombre>
    <Identificacion><Tipo>02</Tipo><Numero>3101234567</Numero></Identificacion>
    <NombreComercial>Materiales Ejemplo</NombreComercial>
  </Emisor>
  <DetalleServicio>
    <LineaDetalle>
      <NumeroLinea>1</NumeroLinea>
      <Cantidad>20.000</Cantidad>
      <Detalle>CEMENTO GRIS 50 KG</Detalle>
      <PrecioUnitario>6500.00000</PrecioUnitario>
      <MontoTotalLinea>146900.00000</MontoTotalLinea>
    </LineaDetalle>
    <LineaDetalle>
      <NumeroLinea>2</NumeroLinea>
      <Cantidad>10</Cantidad>
      <Detalle>VARILLA #3 GRADO 40</Detalle>
      <PrecioUnitario>2900</PrecioUnitario>
      <MontoTotalLinea>32770.50</MontoTotalLinea>
    </LineaDetalle>
  </DetalleServicio>
  <ResumenFactura>
    <CodigoTipoMoneda><CodigoMoneda>CRC</CodigoMoneda><TipoCambio>1</TipoCambio></CodigoTipoMoneda>
    <TotalComprobante>179670.50000</TotalComprobante>
  </ResumenFactura>
</FacturaElectronica>`;

test("lee una factura electrónica", () => {
  const d = parseHaciendaXml(factura)!;
  assert.equal(d.kind, "FACTURA");
  assert.equal(d.key, KEY);
  assert.equal(d.date, "2026-11-26");
  assert.equal(d.supplier, "Materiales Ejemplo");
  assert.equal(d.supplierId, "3101234567");
  assert.equal(d.lines.length, 2);
  assert.equal(d.lines[0].quantity, 20);
  assert.equal(totalInColones(d), 179671);
});

test("una sola línea de detalle también se lee como lista", () => {
  const one = factura.replace(/<LineaDetalle>\s*<NumeroLinea>2[\s\S]*?<\/LineaDetalle>/, "");
  assert.equal(parseHaciendaXml(one)!.lines.length, 1);
});

test("convierte dólares con el tipo de cambio del comprobante", () => {
  const usd = factura.replace("<CodigoMoneda>CRC</CodigoMoneda><TipoCambio>1</TipoCambio>", "<CodigoMoneda>USD</CodigoMoneda><TipoCambio>505.25</TipoCambio>").replace("179670.50000", "100.00");
  const d = parseHaciendaXml(usd)!;
  assert.equal(d.currency, "USD");
  assert.equal(totalInColones(d), 50525);
});

test("rechaza XML que no es un comprobante", () => {
  assert.equal(parseHaciendaXml("<MensajeHacienda><Clave>123</Clave></MensajeHacienda>"), null);
  assert.equal(parseHaciendaXml("no es xml <"), null);
});
