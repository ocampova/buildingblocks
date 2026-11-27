# Obra

Herramienta web para el celular y la computadora que controla los gastos de una construcción manejada por sus dueños: gastos por etapa con sus respaldos, caja chica, cuentas entre socios y los pedidos de materiales del constructor con cotizaciones comparadas.

"Obra" es un nombre provisional.

- Plan de producto, alcance y fases: [docs/PLAN.md](docs/PLAN.md)
- Contexto de producto: [PRODUCT.md](PRODUCT.md) · Diseño: [DESIGN.md](DESIGN.md)

## Fase 1 (lista)

- **Registrar un gasto en una pantalla:** foto, PDF o XML del respaldo, monto, quién pagó (un socio, la caja chica, mitad y mitad, o queda por pagar) y etapa.
- **Factura electrónica:** el XML de Hacienda llena el gasto solo y no deja registrar la misma factura dos veces.
- **Fotos de recibos con IA (opcional):** con `ANTHROPIC_API_KEY`, la foto llena el monto, el proveedor y la fecha. Sin la clave, se llena a mano.
- **Cuentas entre socios:** lo que puso cada uno, quién le debe a quién, transferencias para emparejar y caja chica con recarga sugerida que además empareja.
- **Resumen:** gastado por etapa, por pagar y vencimientos, porcentaje con factura electrónica.
- **Ajustes:** invitar personas por enlace (WhatsApp o copiar), roles, porcentaje de cada socio, etapas y presupuestos, mínimo de la caja.

## Fase 2 (lista)

- **Pedidos del constructor:** materiales, cantidades, marca o calidad esperada y la fecha en que los necesita. Puede escribirlos o leer una lista desde una foto (con IA).
- **Cotizaciones:** foto, captura de WhatsApp o PDF; con IA se leen los precios y se alinean con cada material del pedido, marcando si la marca o calidad no es la pedida. También se pueden escribir a mano.
- **Comparación lado a lado:** mejor precio por material respetando la calidad, lo que le falta a cada proveedor, transporte, entrega y crédito. Un toque para "lo más barato por material" o "todo a un proveedor".
- **Compra:** crea un gasto por proveedor (con su transporte) y entra a las cuentas entre socios como cualquier gasto.
- **Recibido:** el constructor marca cuando llega a la obra y anota faltantes.
- **Avisos en el celular:** pedido nuevo, pedido comprado, recibido en obra, caja chica bajo el mínimo.

Roles: **socio** (ve y hace todo), **administración** (cotiza, compra, registra gastos y pagos, no borra), **constructor** (pide materiales, ve cotizaciones y precios, marca recibidos; no ve las cuentas entre socios ni la caja).

## Correr en local

Requiere Node 22 y PostgreSQL.

```bash
cp .env.example .env   # y llene DATABASE_URL y AUTH_SECRET
npm install
npx prisma migrate dev
npm run demo           # opcional: datos ficticios (andres@demo.cr / demo1234)
npm run dev
```

Sin datos de demostración, la primera visita lleva a `/configurar` para crear el proyecto y la cuenta del primer socio.

Pruebas: `npm test` (cuentas entre socios y lectura del XML de Hacienda).

## Desplegar en Railway

1. Nuevo proyecto con este repositorio y un servicio de PostgreSQL.
2. Variables del servicio de la app: `DATABASE_URL=${{Postgres.DATABASE_URL}}`, `AUTH_SECRET=${{secret(48)}}` y, si se quiere la lectura de fotos, listas y cotizaciones, `ANTHROPIC_API_KEY`. Las claves de los avisos se generan solas.
3. `railway.json` ya define la compilación y el arranque; las migraciones corren solas al arrancar.

Los respaldos (fotos, PDF, XML) se guardan en la base de datos por ahora.
