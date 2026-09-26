# Plan — Correcciones de la ronda de prueba (vista cliente + panel)

Ninguno de estos pedidos está en las fases E–H de `tasks/plan.md`. Hay dos
que se cruzan con trabajo abierto:

- **Horario partido con N bloques** reescribe el mismo formulario que la
  **Fase G** (Disponibilidad mobile). Primero se cambia el modelo de datos y
  después se construye la Fase G sobre la lista de tramos, para no hacer el
  formulario dos veces.
- **Espacio blanco de la tab bar** y los ajustes de **Caja** son hallazgos de
  las verificaciones manuales pendientes de las fases A y D.

## Decisiones confirmadas

- **Scroll suave forzado**: se ignora `prefers-reduced-motion` para los
  desplazamientos que dispara un botón. Son cortos y los inicia el usuario.
  Las animaciones decorativas en bucle (glow, grilla, CTA) siguen
  respetando el ajuste.
- **Portada oculta sin vuelta atrás**: tras "Reservar turno" la portada
  desaparece. Recargar la página la trae de nuevo.
- **Bloques de horario sin límite fijo**: lista de tramos por día, con
  "+ Agregar bloque".
- **Productos**: son ventas independientes de los cortes, sin relación con
  el catálogo de servicios. Flujo: "Venta suelta" → categoría "Producto" →
  nombre libre, precio, medio de pago y nota opcional. En Caja la venta
  entra en la lista de movimientos con la etiqueta "Producto". Los totales
  siguen como hoy, sin subtotal por categoría.
- **Verde en horarios**: la referencia es una lista de agenda con la hora de
  cada fila en verde y en negrita, más un filete verde claro a la izquierda
  de las tarjetas con turno. Los huecos libres llevan la hora en verde, pero
  sin filete.

## Supuestos (corregir si no van)

- El verde se aplica a la lista de la vista día de Agenda (mobile). La
  tabla de escritorio, Hoy y el resto de las vistas quedan monocromos.
- Ocultar un turno cancelado de Hoy y Agenda deja inaccesible su ficha
  (variante "cancelado" de la Fase B). El dato sigue en la base, y Caja no
  cambia: ya excluía los cancelados.
- Se oculta solo `cancelado`. `no_show` sigue visible.

## Tareas, en orden

### T1 — Victorias rápidas

1. **Logo sin animación** (`app/globals.css`): se quitan `animation` y
   `@keyframes hs-logo-breathe` de `.hs-hero-logo`. Quedan el
   `transform: translate(-50%, -50%)` y la opacidad de reposo (0.055). El
   glow y la grilla no se tocan.
2. **Cancelados fuera de Hoy y Agenda** (`lib/data/appointments.ts`): se
   agrega `.neq("status", "cancelado")` en `getAppointmentsBetween`. Sus
   únicos llamadores son Hoy y Agenda (día, semana y mes, en desktop y
   mobile), así que un solo filtro cubre también el oscuro de las celdas del
   mes y los conteos de `month-mobile`.
3. **Mes de Caja → vista día** (`app/admin/caja/caja-views.tsx`): cada celda
   de un día real del heatmap pasa a ser un `Link` a
   `/admin/caja?vista=dia&fecha=<día>`.
4. **Espacio blanco de la tab bar** (implementado, distinto de lo planeado).
   `app/layout.tsx` no declara `viewportFit: "cover"`, así que en Safari
   `env(safe-area-inset-bottom)` vale 0 y el piso de 22px de
   `max(env(...), 22px)` quedaba como aire fijo. Se descartó declarar
   `viewportFit: "cover"`: el sitio se usa en Safari, sin manifest ni modo
   app, y el navegador ya reserva su propio margen abajo. "Cover" además
   obligaría a compensar el área segura de arriba. Se bajó el piso a 6px,
   simétrico con el `pt-1.5`, y se ajustaron con el mismo número el FAB de
   venta suelta y el offset de los avisos. Con los avisos apareció un bug:
   por debajo de 600px, Sonner ignora `offset` y usa `mobileOffset` (16px
   por defecto), así que en el celular los avisos quedaban encima de la tab
   bar. Ahora se pasan los dos.

**Verificación**: typecheck y tests. En el navegador: cancelar un turno y
comprobar que desaparece de Hoy y de las 3 vistas de Agenda, tocar un día del
heatmap, y revisar la tab bar en el iPhone.

### T2 — Selector de fecha nativo (Caja, vista día)

- Componente reutilizable nuevo, `components/admin/native-date-pill.tsx`. Es
  una píldora con la fecha legible y un `<input type="date">` superpuesto
  con `opacity-0`, que ocupa toda la píldora. Así un toque en cualquier parte
  abre el selector nativo: la rueda o calendario en iOS, el diálogo Material
  en Android.
- En el clic también se llama a `input.showPicker()` dentro de un
  `try/catch`, porque en Chrome de escritorio tocar el texto del input no
  siempre abre el calendario.
- El `value` (`yyyy-MM-dd`) se usa tal cual como `dateKey`, sin pasar por
  `Date`: la conversión UTC correría la fecha un día, el mismo problema que
  `calendarDateToKey`. Un valor vacío se ignora, porque iOS permite borrar la
  fecha.
- Al cambiar el valor se navega con `router.push` a
  `/admin/caja?vista=dia&fecha=…`. El texto de la píldora sale del
  `dateKey` de la URL, así que queda sincronizado.
- Reemplaza el título de `CajaToolbar` solo en la vista día. Las flechas
  anterior/siguiente se mantienen.

**Verificación**: en iPhone real, en Android si hay uno a mano, y en Chrome y
Safari de escritorio.

### T3 — Portada y scroll suave (vista cliente)

- `HeroCta`: se quita la salida anticipada por `prefers-reduced-motion`
  (decisión confirmada), y se actualiza el comentario que la justificaba.
- Nuevo contenedor cliente en `app/page.tsx` que envuelve a `SiteHero` y
  `BookingStepper`, con un estado `heroHidden`. Al terminar el scroll suave
  (evento `scrollend`, con un timeout de respaldo para Safari viejo) se
  desmonta la portada y, en el mismo frame, se lleva el scroll a 0. Así el
  stepper queda donde estaba, sin salto visible.
- Continuar/Volver del stepper hoy cambian de paso sin desplazar. Pasan a
  subir suavemente al inicio de `#reservar` si el tope quedó fuera de
  pantalla.
- **No** se usa `scroll-behavior: smooth` global en `html`: rompería el
  salto al tope que hace el router al enviar la reserva. Ver el comentario
  de `hero-cta.tsx`.

**Verificación**: iPhone real (con "Reducir movimiento" activado), desktop y
navegación con teclado (el foco tiene que seguir cayendo en `#reservar`).

### T4 — Venta de productos

- **Migración `0008_ventas_productos.sql`**: columna `kind` en
  `walk_in_sales` (`'servicio' | 'producto'`, default `'servicio'`, así que
  las filas existentes no cambian). No se puede deducir "producto" de un
  `service_id` nulo, porque borrar un servicio también lo deja nulo
  (`on delete set null`). Se aplica en Supabase solo después de confirmarlo
  con vos (regla de SPEC §8).
- `lib/validation/schemas.ts` y `lib/actions/sales.ts`: si es producto se
  pide un nombre libre y un monto, y no se busca en el catálogo.
- `database.types.ts`: se regenera o se ajusta a mano.
- `WalkInSaleButton`: segmentado "Servicio / Producto" arriba del diálogo.
  En producto, el `Select` de servicio pasa a ser un campo de texto
  ("Cera, bebida…") y el monto arranca vacío. Medio de pago y nota,
  iguales que en servicio.
- `lib/data/cashbox.ts`: `origin` suma `"producto"`, además de `"turno"` y
  `"venta_suelta"`. La lista de movimientos (mobile y la tabla de escritorio)
  muestra la etiqueta "Producto". Los totales y el desglose por medio de pago
  no cambian: el producto suma como cualquier otro cobro.
- `SPEC.md` §2 decía "ventas sueltas usan el catálogo de servicios". Se
  actualiza para reflejar productos de texto libre.

### T5 — Horario con N bloques (antes de la Fase G o fusionado con ella)

La tarea de mayor riesgo, porque toca el motor de slots del portal público.

- **Migración**: tabla `business_hour_ranges` (`weekday`, `opens_at`,
  `closes_at`, `position`), con restricción de no solapamiento dentro del
  mismo día. Se hace un backfill desde `opens_at/closes_at` y
  `opens_at_2/closes_at_2`. Las columnas viejas se retiran en una migración
  posterior, una vez verificado (expand/contract).
- `lib/availability.ts`: `DayHours.secondRange` pasa a `ranges[]`. Tests
  nuevos: slots encadenados según la duración en 3 o más tramos, un tramo
  más corto que el servicio, y tramos desordenados.
- Lecturas (`lib/data/availability.ts`, `getBusinessHoursForDay`),
  `computeFreeGaps`, acciones y validación de disponibilidad.
- Formulario (`business-hours-form.tsx`, `time-blocks.tsx`): "+ Agregar
  bloque" y quitar bloque. Se diseña ya con la hoja por día de la Fase G.

### T6 — Verde en los horarios

- `app/tokens.css`: dos tokens nuevos, porque la paleta del panel es
  monocroma.
  - `--hs-green` (aprox. `#178a5e`) para la hora. Es un poco más oscuro que
    el de la referencia (`~#1e9e6e`), que sobre blanco no llega al contraste
    4.5:1 a 12–14px.
  - `--hs-green-soft` (aprox. `#9fdcc2`) para el filete.
- `app/admin/agenda/agenda-views.tsx`, en `GapRow` y `AgendaAppointmentRow`:
  - La hora pasa de `text-muted-foreground text-xs font-medium` a
    `--hs-green`, en semibold y un punto más grande. La columna se ensancha
    si hace falta.
  - La tarjeta con turno suma `border-l-[3px]` con `--hs-green-soft`.
- Los cancelados ya no aparecen (T1), así que no hay que decidir qué color
  lleva un turno cancelado.

**Verificación**: iPhone real, comparando contra la captura.
