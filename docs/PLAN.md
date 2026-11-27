# Obra: plan de producto (v0.1)

> Herramienta web para el celular y la computadora que ayuda a controlar los gastos de una construcción
> manejada por sus dueños: ellos contratan la mano de obra y compran los materiales a partir de las listas
> del constructor. "Obra" es un nombre provisional.

## 0. Contexto

| Dato | Valor |
|---|---|
| Proyecto | Edificio de apartamentos de dos hermanos, en Costa Rica |
| Estado | Planos listos, terreno pagado, arquitecto pagado en gran parte |
| Modelo de construcción | Se contrata solo la mano de obra; los dueños pagan la CCSS y compran los materiales |
| Socios | Dos hermanos, **50/50** en todos los gastos |
| Moneda | Colones (CRC) |
| Financiamiento | Préstamos personales de cada socio. **Fuera de la herramienta** |

**Lo que se busca:** una herramienta que dé "lo que necesitamos, no más, no menos", fácil de usar y sin
meter mucha administración.

---

## 1. Usuarios y roles

| Rol | Quién | Puede hacer | No ve |
|---|---|---|---|
| **Socio** | Los dos hermanos | Todo: gastos, pagos, caja chica, pedidos, cotizaciones, configuración | |
| **Administración** | La cuñada (usuaria principal) | Cotizar, comprar, registrar gastos y pagos, subir respaldos | |
| **Constructor** | El constructor | Crear pedidos de materiales, ver sus cotizaciones y precios, marcar "recibido" | Cuentas entre socios y caja chica |

- La administración **no es socia**: no tiene saldo propio. Si paga algo, se registra como pagado por el
  socio de quien era el dinero, o desde la caja chica.
- No hay aprobaciones formales: los tres se coordinan por WhatsApp. La herramienta registra qué se eligió,
  quién lo hizo y cuándo.

---

## 2. Estructura

```
Proyecto
 ├── Etapas: Movimiento de tierra, Cimentaciones, Estructura, Mampostería, Techos,
 │           Electricidad, Fontanería, Acabados, … y Gastos generales
 ├── Gastos (cada uno en una etapa) → pagos → respaldos
 ├── Pedidos de materiales (del constructor) → cotizaciones → compra
 └── Caja chica → depósitos de los socios
```

- **Etapas configurables.** Cada proyecto arranca con la lista estándar y la ajusta.
- **Gastos generales** es una etapa más, para lo que no es construcción: CCSS, póliza de riesgos del trabajo
  del INS, permisos municipales y del CFIA, conexiones de agua y luz, terreno y arquitecto.
- **Presupuesto por etapa: opcional.** Si se carga, el resumen muestra gastado contra presupuestado.

---

## 3. Las 4 pantallas

### P1. Gastos
- Botón principal en el celular: **foto → monto → quién pagó → etapa**. Menos de un minuto.
- **Quién pagó:** un socio o la **caja chica**. Un gasto puede tener varios pagos: dividido entre los dos,
  pagos parciales o a crédito.
- **Estado:** pagado o **por pagar**, con fecha de vencimiento opcional.
- **Respaldo**, de cualquiera de estos tipos:

| Respaldo | Ejemplo | Cómo entra |
|---|---|---|
| Factura electrónica | Ferreterías grandes | XML de Hacienda: se lee solo, sin errores |
| Tiquete o recibo | Compras pequeñas | Foto: la IA llena proveedor, fecha, líneas y total |
| Nota o conteo | Vagonetas, horas de maquinaria | Foto de la nota |
| Comprobante de pago | SINPE o transferencia | Captura de pantalla |
| Sin respaldo | Efectivo sin recibo | Se permite, queda marcado |

- **Sin duplicados:** la clave de 50 dígitos de la factura electrónica es única por proyecto. Para fotos,
  aviso si ya hay un gasto con el mismo proveedor, monto y fecha.
- **Carga histórica:** el terreno y el arquitecto se registran al inicio con quién pagó qué.

### P2. Pedidos de materiales
- El **constructor crea el pedido** desde su celular: materiales, cantidades, unidad, **calidad o marca
  esperada** y **fecha en que lo necesita**. Puede escribirlo o fotografiar una lista; la IA la convierte
  en líneas para que él las confirme.
- **Estados:** por cotizar → cotizado → comprado → recibido.
- **Cotizaciones:** cada cotización (foto o PDF, normalmente de WhatsApp) se sube al pedido. La IA la lee
  y la alinea con las líneas del pedido.
- **Comparación lado a lado**, línea por línea. La IA señala:
  - mejor precio por línea y por total,
  - líneas faltantes,
  - marcas o calidades distintas a las pedidas,
  - condiciones: tiempo de entrega, transporte, crédito, moneda.
- Se elige un proveedor o se reparte el pedido entre varios. La compra crea el gasto (o el "por pagar").
- **Fecha límite visible:** cada pedido muestra cuántos días faltan. Si se acerca y no está comprado, avisa.
- **Recibido:** el constructor marca la entrega en obra con un toque; puede anotar faltantes.

### P3. Cuentas entre socios
- **Lo que ha puesto cada socio** = sus pagos directos + sus depósitos a la caja chica
  ± liquidaciones entre socios.
- Los pagos **desde** la caja chica no cuentan a nombre de nadie (ya se contaron al depositar).
- **Saldo de cada socio** = lo que puso − (su porcentaje × lo que pusieron todos).
  Se muestra como "Tu hermano te debe ₡X".
- **Solo cuenta lo pagado**, no lo facturado: una factura pendiente no mueve el saldo.
- **Liquidación:** transferencia entre socios para emparejar. No es un gasto de la obra.
- **Caja chica:** saldo (depósitos − pagos), mínimo configurable con aviso, y **reposición sugerida**:
  al recargar un monto R, propone cuánto deposita cada socio para que además queden parejos.
  Para cada socio: `porcentaje × (total puesto + R) − lo que ya puso`, sin bajar de cero y
  ajustado para que la suma sea R.

### P4. Resumen
- Gastado por etapa y total (y contra presupuesto, si lo hay).
- Por pagar y próximos vencimientos (CCSS, pagos al constructor, créditos de proveedores).
- Pedidos por vencer sin comprar.
- Porcentaje del gasto con factura electrónica (útil ante Hacienda si después se venden o alquilan los
  apartamentos; conviene confirmarlo con un contador).

---

## 4. La IA: qué hace y qué no

**Regla: la IA prepara y señala; las personas confirman.** Nada queda registrado ni elegido sin que alguien
lo confirme.

| Hace | No hace |
|---|---|
| Leer fotos y PDFs de recibos, listas y cotizaciones | Registrar gastos sola |
| Unificar nombres ("varilla 3/8" = "hierro #3") | Elegir la cotización |
| Comparar cotizaciones y revisar marcas y calidades contra el pedido | Inventar precios: la cotización real la da el proveedor |
| (Más adelante) proponer proveedores buscando en internet | |

El XML de Hacienda se lee sin IA.

---

## 5. Fuera del alcance

- Préstamos, intereses y cuotas.
- Aprobaciones formales con montos y firmas.
- Inventario y control de consumo en obra.
- Planilla detallada por trabajador.
- Contabilidad formal y declaraciones de impuestos.
- Registro público, suscripciones y cobro (hasta que se decida ofrecerla a otras construcciones).

---

## 6. Preparada para otras construcciones

Se construye para este proyecto, pero el modelo de datos ya permite usarla en otros que trabajen igual:

- **Varios proyectos**, cada uno con sus miembros y datos separados. Una persona puede estar en varios
  (por ejemplo, un constructor con dos obras).
- **Socios con porcentaje** (50/50 aquí; 60/40 o tres socios en otro proyecto).
- **Etapas configurables** por proyecto.
- Nada en la interfaz depende de este proyecto en particular.

---

## 7. Requisitos no funcionales

- **Mobile first**, instalable como PWA; en la computadora se aprovecha el ancho (tablas, comparación lado
  a lado).
- **Cámara directa** para fotos; las imágenes se comprimen antes de subir (datos móviles débiles en obra).
- Español de Costa Rica, colones con formato `₡1.234.567`, fechas `27/11/2026`.
- **Historial:** cada registro guarda quién lo creó o cambió y cuándo.
- Respaldos privados: solo los miembros del proyecto los ven.
- Copias de seguridad diarias de la base de datos.
- Notificaciones push (pedido nuevo, caja chica baja, vencimientos) y correo de respaldo.

---

## 8. Arquitectura técnica

La misma base que Escuela:

| Pieza | Elección |
|---|---|
| Aplicación | Next.js (App Router, TypeScript), Tailwind |
| Base de datos | PostgreSQL con Prisma |
| Despliegue | Railway |
| Archivos | Bucket de Railway (fotos, PDFs, XML) |
| Sesiones | Login propio (jose + bcrypt), invitación por enlace |
| Notificaciones | Web push (PWA) y correo con Resend |
| IA | API de Claude (Anthropic) para leer documentos y comparar |

### Modelo de datos inicial (simplificado)

```
Usuario(id, nombre, correo, contraseña)
Proyecto(id, nombre, moneda, minimoCaja)
Miembro(proyecto, usuario, rol: SOCIO | ADMINISTRACION | CONSTRUCTOR, porcentaje?)
Etapa(proyecto, nombre, orden, presupuesto?)
Proveedor(proyecto, nombre, cedula?, telefono?)

Gasto(proyecto, etapa, proveedor?, fecha, descripcion, total, vence?, claveHacienda? único, pedido?)
  LineaGasto(gasto, descripcion, cantidad, precioUnitario)
Pago(gasto, fecha, monto, origen: SOCIO | CAJA, socio?)
Adjunto(proyecto, tipo: XML | FOTO | PDF | COMPROBANTE, url, gasto? | pago? | pedido? | cotizacion?)

DepositoCaja(proyecto, socio, fecha, monto)
Liquidacion(proyecto, deSocio, aSocio, fecha, monto)

Pedido(proyecto, etapa, creadoPor, fechaRequerida, estado, notas)
  LineaPedido(pedido, material, cantidad, unidad, calidadEsperada)
Cotizacion(pedido, proveedor, fecha, moneda, tipoCambio?, entrega?, transporte?, credito?)
  LineaCotizacion(cotizacion, lineaPedido?, descripcion, marca?, cantidad, precioUnitario, cumple?)
  (elección: LineaPedido → LineaCotizacion elegida)

Todo registro: creadoPor, creadoEn, modificadoPor, modificadoEn
```

---

## 9. Plan por fases

| Fase | Contenido | Por qué en este orden |
|---|---|---|
| **1. El dinero** | Login e invitaciones, proyecto y roles, etapas, gastos con foto y pagos, caja chica, cuentas entre socios, resumen, carga histórica, lectura de fotos con IA e importación de XML, PWA | El dinero ya está saliendo: cada gasto sin registrar es información que se pierde |
| **2. Los materiales** | Pedidos del constructor con fecha, cotizaciones, comparación con IA, elección, compra que crea el gasto, "recibido", notificaciones push | Es el flujo diario de la cuñada y el constructor |
| **3. Comodidades** | Recordatorios de vencimientos (CCSS), compartir desde WhatsApp a la app, exportar a Excel, búsqueda de proveedores con IA | Solo si el uso real lo pide |
| **4. Otras construcciones** | Registro, suscripción, panel de clientes | Solo si se decide ofrecerla |

---

## 10. Preguntas abiertas

1. **Nombre** definitivo (opciones: Obra, Obrero, Cimiento, Bitácora, BuildIt).
2. **Pagos al constructor:** ¿semanal, por avance de obra o por etapa? ¿Hay adelantos o retenciones?
3. **CCSS:** ¿se paga sobre la lista de trabajadores que pasa el constructor o sobre un monto calculado
   del contrato? ¿Ya está inscrita la obra? ¿Tienen la póliza del INS?
4. **Arquitecto:** ¿también fue 50/50?
5. **Efectivo en obra:** ¿quién lo maneja?
6. **Presupuesto:** ¿tienen uno por etapas (aunque sea en Excel) para cargarlo?
7. **Caja chica:** ¿qué cuenta usarían y qué monto mínimo quieren mantener?

---

## 11. Siguiente paso

Revisar este plan entre los tres (los dos socios y la administración) y responder las preguntas abiertas.
Después: `DESIGN.md` y empezar la fase 1.
