# Obra

Herramienta web para el celular y la computadora que controla los gastos de una construcción manejada por sus dueños: gastos por etapa con sus respaldos, caja chica y las cuentas entre socios. En la fase 2 se agregan los pedidos de materiales del constructor con cotizaciones comparadas.

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

Roles: **socio** (ve y hace todo), **administración** (registra gastos y pagos, no borra), **constructor** (por ahora ve el resumen; en la fase 2 pide materiales).

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
2. Variables del servicio de la app: `DATABASE_URL=${{Postgres.DATABASE_URL}}`, `AUTH_SECRET=${{secret(48)}}` y, si se quiere la lectura de fotos, `ANTHROPIC_API_KEY`.
3. `railway.json` ya define la compilación y el arranque; las migraciones corren solas al arrancar.

Los respaldos (fotos, PDF, XML) se guardan en la base de datos por ahora.
