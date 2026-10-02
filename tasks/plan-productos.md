# Plan — Categorías, productos, venta con carrito y Caja por categoría

Referencia: el canvas de diseño del usuario "HOUSSESTUDIO Caja · opción A"
(https://claude.ai/code/artifact/2ed31a9b-1b3e-4cfb-b9e1-c9b3fca4b3f8), con 14
pantallas: Caja día, semana y mes (escritorio e iPhone), venta suelta
(escritorio e iPhone), Más con Productos (escritorio e iPhone) y Productos
(escritorio, y en el iPhone categorías → detalle → "Nuevo producto").

Alcance: **todo entra en lo que se entrega gratis** (decisión del usuario).

## Qué es modificar y qué es nuevo

| Pantalla | Hoy | Con el rediseño | Tipo |
| --- | --- | --- | --- |
| Más | Servicios y Disponibilidad | Suma "Productos" (con marca NUEVO) entre los dos | Modificar |
| Nav de escritorio | Hoy, Agenda, Solicitudes, Caja, Servicios, Disponibilidad | Suma "Productos" entre Servicios y Disponibilidad | Modificar |
| Productos | No existe | Escritorio: categorías a la izquierda y productos de la elegida a la derecha, con alta en línea. iPhone: categorías → detalle → hoja "Nuevo producto" | **Nueva** |
| Venta suelta | Selector Servicio/Producto; un servicio del catálogo o un producto de nombre libre, un ítem por venta, monto editable | Lista por categoría (los servicios son la categoría "Cortes"), buscador, "Agregar" o contador por ítem, **varios ítems por venta**, total y medio de pago al pie, nota | Modificar a fondo |
| Caja día (iPhone) | Tarjeta de total + lista de movimientos | Total + una tarjeta desplegable por categoría, con cada movimiento adentro | Modificar |
| Caja semana / mes (iPhone) | Total + barras por día / calendario de calor | Total + tarjetas por categoría con cada concepto agregado (cantidad × precio, efectivo/transferencia) | Modificar (ver pregunta 1) |
| Caja día / semana / mes (escritorio) | Tres tarjetas + tabla de movimientos | Tres tarjetas (total con conteo de ventas, efectivo y transferencia con barra de %) + tabla agrupada por categoría, desplegable, con "% del total" | Modificar |

## Qué hay que cambiar en los datos

Hoy una venta suelta es **una fila** de `walk_in_sales` con un solo concepto:
`kind` (servicio/producto), `service_id`, `service_name` (para un producto, el
nombre libre), `amount`, `method`, `note`. No hay catálogo de productos ni
categorías, y no hay cantidades.

Propuesta (migración `0012`, aditiva):

1. **`product_categories`**: `id`, `name` (único), `sort_order`, `created_at`.
2. **`products`**: `id`, `category_id` (FK, borrar una categoría con productos
   se impide), `name`, `price`, `is_active`, `sort_order`, `created_at`.
3. **`walk_in_sales` pasa a ser una fila por ítem vendido**, agrupadas por
   venta. Columnas nuevas:
   - `sale_id uuid`: agrupa los ítems de una misma venta (un carrito);
   - `product_id` (FK a `products`, `on delete set null`);
   - `category_id` (FK a `product_categories`, `on delete set null`): la
     categoría al momento de vender;
   - `quantity int` (≥ 1) y `unit_price`; `amount` queda como el subtotal
     (`quantity × unit_price`), así los totales de Caja no cambian de fórmula.
   - Copia de lo existente: `sale_id` = su propio `id`, `quantity` 1,
     `unit_price` = `amount`.
   - Por qué así y no una tabla de cabecera + ítems: la Caja ya lista y suma
     filas de `walk_in_sales`; el día por categoría muestra cada ítem como un
     movimiento propio, y el medio de pago y la nota se repiten por ítem. Es el
     cambio más chico que cubre el diseño.
4. **Los servicios no llevan categoría en la base**: se agrupan todos en la
   categoría fija de servicios ("Cortes", ver pregunta 2). Los cobros de turnos
   también caen ahí.
5. **Ventas viejas de producto con nombre libre** (cera, coca, alfajor…): sin
   categoría → se agrupan en **"Otros"** (ver pregunta 4).
6. RLS de admin en las dos tablas nuevas (la 0002 no las cubre sola) y
   `database.types.ts` a mano.

Se aplica en Supabase solo después de mostrarla, como las anteriores.

## Tareas, en orden

### P1 — Datos: migración 0012 y agregación de Caja por categoría (puro)
- La migración de arriba.
- `lib/cashbox.ts`: `groupByCategory(movements)` → categorías en orden (Cortes
  primero, luego las de productos por `sort_order`, "Otros" al final), cada una
  con cantidad, subtotal, efectivo/transferencia, % del total y sus conceptos
  agregados (nombre, cantidad, precio unitario, efectivo/transferencia). Con
  tests, incluida la conservación (la suma de categorías = el total de hoy).
- `lib/data/cashbox.ts`: trae categoría, producto, cantidad y precio de cada
  movimiento.
- **Verificación**: tests; la Caja actual no cambia.

### P2 — Productos (gestión)
- Acciones: crear/renombrar/borrar categoría (borrar solo si está vacía),
  crear/editar/borrar producto (precio, nombre, categoría). Validación con Zod
  y tests.
- Escritorio (`/admin/productos`): dos columnas, alta en línea de Nombre y
  Precio, editar y borrar por fila, "Nueva categoría", "Renombrar".
- iPhone: categorías → detalle (`/admin/productos/[categoria]` o estado
  local) → hoja "Nuevo producto" (y la misma hoja para editar).
- Más (iPhone) suma la fila "Productos" con "NUEVO"; la nav de escritorio, la
  pestaña. La tab bar marca Más activo dentro de Productos.
- **Verificación**: iPhone y escritorio, crear categorías y productos reales.

### P3 — Venta suelta con carrito
- Hoja (iPhone) / diálogo (escritorio): buscador, categorías desplegables con
  "x elegidos", "Agregar" → contador − n +, medio de pago, nota, pie con
  unidades, resumen y total, "Registrar venta".
- Acción `recordWalkInSale` pasa a recibir una lista de ítems: inserta una fila
  por ítem con el mismo `sale_id`, en una sola transacción (función de
  Postgres, como `save_business_hours`).
- Se retira el selector Servicio/Producto y el nombre libre (ver pregunta 3).
- **Verificación**: una venta con un corte + productos sale en Caja.

### P4 — Caja por categoría (iPhone)
- Día: tarjetas por categoría con los movimientos (hora · origen, nota,
  monto, medio). Semana/Mes: conceptos agregados.
- Tarjetas desplegables; el total de arriba no cambia.

### P5 — Caja por categoría (escritorio)
- Tarjetas de arriba: total con "N ventas · X servicios y Y productos",
  efectivo y transferencia con % y barra.
- Tabla agrupada desplegable: día (concepto, hora, origen, medio, monto, % del
  total) y semana/mes (cantidad, precio, efectivo, transferencia, subtotal, %
  del total), con fila de total.

### P6 — Cierre
- SPEC.md (ventas sueltas con catálogo de productos), README (migración 0012),
  vista previa si cambia algo de emails (no debería).

## Preguntas y contradicciones

1. **Caja semana/mes en el iPhone**: la nota del diseño dice "solo se suma la
   división por categoría debajo del total", pero las pantallas no muestran las
   barras por día ni el calendario de calor que hay hoy. ¿Se reemplazan o se
   suman debajo?
2. **Nombre de la categoría de servicios**: el diseño usa "Cortes". ¿Fijo, o
   "Servicios", o configurable?
3. **Precio editable y producto libre en la venta**: hoy se puede cambiar el
   monto (un descuento) y cargar un producto que no está en el catálogo. El
   diseño no tiene ninguna de las dos. ¿Se pierden, o se agrega un "ajustar
   precio" / "otro producto"?
4. **Ventas viejas con nombre libre**: propuesta, agruparlas en "Otros".
5. **Barra lateral en la Caja de escritorio**: las tres pantallas de Caja
   usan una barra lateral izquierda; Más y Productos usan la barra superior de
   hoy. Propuesta: mantener la barra superior en todo el escritorio.
6. **Datos de ejemplo**: en Caja mes/semana, "Bebidas y alfajores" se abre en
   "Bebidas" y "Alfajores", pero en Productos son Coca-Cola, Sprite, Agua,
   Alfajor y Alfajor triple. Propuesta: la Caja agrega por **producto** (lo que
   se vende), no por subgrupos.
7. **Stock**: el diseño no lo menciona; queda fuera.
