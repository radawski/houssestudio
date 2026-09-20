# Plan — Wireframes móviles del panel `/admin` (iPhone 390×844)

Fuente: `design/admin-iphone/` (README, `canvas.json` → `notes`, 28 `.dc.html`).
Verifiqué la fidelidad de las notas contra los renders reales de `Main.dc.html`
y `CajaMes.dc.html`: coinciden al pixel. El resto de los `.dc.html` los abro
recién al implementar cada pantalla — las notas ya traen medidas, tokens,
orden de bloques y qué es `<a>`/`<button>`, así que releerlos todos ahora sería
duplicar contexto sin cambiar el plan.

No es un re-skin: hay piezas de UI y de datos que no existen en el código
actual (ficha del turno, tab bar inferior, pantalla Más, hojas por bottom
sheet, esqueletos de carga, errores por ruta). Están marcadas como tales en
cada fase.

## Verificación previa: tokens

Los hex de `n-sistema` calzan exactos con `app/tokens.css` — no hace falta
ningún token nuevo:

| Nota | Token existente |
|---|---|
| ink `#111315` | `--hs-ink` |
| graphite `#2a2d30` | `--hs-graphite` |
| slate `#4a4f55` | `--hs-slate` |
| mist `#b8bdc3` | `--hs-mist` |
| paper `#f4f5f7` | `--hs-paper` |
| destructivo `#b0332a` | `--destructive` (el oklch ya resuelve a ese hex) |
| ámbar (fondo/borde/texto) | clases Tailwind `amber-100`/`amber-200`/`amber-900` (ya usadas en `lib/status.ts`) |

**Único desajuste encontrado**: el punto del badge "Pendiente" usa hoy
`bg-amber-500`; la nota pide `#b45309`, que es `amber-700`. Es un cambio de
una clase en `lib/status.ts`, no un token nuevo — lo incluyo en la Fase A.

## Conflictos estructurales (wireframe vs. código actual)

1. **Navegación**: hoy `AdminNav` es una barra superior de 6 ítems, igual en
   toda resolución. El wireframe pide una tab bar inferior de 5 ítems solo en
   mobile, con Servicios y Disponibilidad colgando de una pantalla nueva
   "Más" (`app/admin/mas/page.tsx`, no existe). En desktop el nav actual no
   se toca — es una adición condicionada por breakpoint, no un reemplazo.
2. **Diálogos → hojas**: `components/ui/dialog.tsx` es el `Dialog` de Radix
   centrado. La nota `n-hojas` pide restylearlo a bottom sheet en mobile
   (mismo componente, mismo primitive, otra presentación) mantieniendo el
   modal centrado en desktop. Es un cambio en un solo archivo compartido por
   todos los diálogos del panel.
3. **Ficha del turno**: no existe. Hoy un turno `completado`/`cancelado` no
   tiene ninguna interacción en `AppointmentCard` (sin fila de acciones, sin
   nada que tocar). El wireframe abre una hoja con datos del cliente, el pago
   (o el motivo de cancelación) y una línea de tiempo. Necesita: traer el
   pago asociado al turno en la lectura, y un componente nuevo.
4. **Caja semana/mes**: hoy ambas vistas reusan la tabla de movimientos del
   día. El wireframe pide visualizaciones nuevas — barras por día (semana) y
   un heatmap de un mes calendario completo (mes) — que no son un ajuste de
   estilos, son lógica de agregación nueva sobre los mismos datos.
5. **Disponibilidad**: hoy es un formulario único de 7 filas + un botón
   "Guardar horarios" que manda las 7 a la vez. El wireframe lo vuelve un
   resumen colapsado con una hoja de edición por día (guarda un solo día) más
   "Copiar este horario a todos los días" — necesita una Server Action nueva
   o un ajuste de la existente.
6. **Estados de carga/error**: no existen (`loading.tsx`/`error.tsx` no están
   creados en ninguna ruta admin). Son archivos nuevos, patrón nuevo en el
   repo.
7. **Toasts**: el `<Toaster position="top-center" richColors />` es global
   (`app/layout.tsx`), usado también por el portal público. El wireframe pide
   los avisos del panel abajo, sobre la tab bar. Como es un solo `Toaster`
   para toda la app, la forma de no romper el público es leer el pathname
   adentro de `components/ui/sonner.tsx` (ya es client component) y variar
   `position`/offset solo para `/admin`. Lo marco como decisión a confirmar
   más abajo.

## Fases (orden de dependencia)

Cada fase es un incremento verificable — se prueba en el navegador (viewport
390px y desktop) antes de pasar a la siguiente, mismo criterio que las fases
de Fase 2.

### Fase A — Fundaciones compartidas

Todo lo demás se apoya en esto.

- `lib/status.ts`: punto ámbar `amber-500` → `amber-700`.
- `components/ui/dialog.tsx`: variante bottom sheet en mobile (grabber,
  pegado abajo, radio superior, scrim, `data-state` + `translate-y`),
  centrado sin cambios en `sm:` en adelante.
- `components/ui/sonner.tsx`: posición/offset condicionados a `/admin` vía
  `usePathname()`.
- `app/admin/layout.tsx` + nuevo `app/admin/admin-tab-bar.tsx`: tab bar
  inferior de 5 ítems, mobile-only (`AdminNav` actual se conserva para
  `md:` en adelante, oculto en mobile).
- `app/admin/mas/page.tsx` (nueva ruta): tarjetas a Servicios/Disponibilidad
  + tarjeta de sesión con `signOut`.
- Header "← + título" para Servicios y Disponibilidad en mobile (chrome
  normal sin cambios en desktop).

### Fase B — Hoy + Ficha del turno

- `lib/data/appointments.ts`: sumar el pago asociado (join a `payments`)
  cuando el turno está `completado`.
- `components/admin/appointment-sheet.tsx` (nuevo): ficha con las dos
  variantes (completado/cancelado), línea de tiempo desde
  `created_at`/`confirmed_at`/`completed_at`/`cancelled_at`.
- `components/admin/appointment-card.tsx`: completado/cancelado abren la
  ficha al tocar la tarjeta; pending state compartido entre "Cobrar" y "No
  vino" de la misma tarjeta (hoy cada botón maneja su propio `useTransition`
  — hay que levantarlo al padre para que "No vino" se deshabilite mientras
  "Cobrar" está en vuelo).
- `app/admin/page.tsx`: ajustar a las medidas exactas del wireframe (grid de
  3 tiles, banner ámbar como fila-link completa).

### Fase C — Agenda mobile

- Tira de 7 días (día activo) en la vista día — no existe hoy.
- Vista semana: lista vertical por día en mobile (`md:hidden`), la grilla de
  4 columnas actual queda para desktop (`hidden md:grid`) — son modelos de
  interacción distintos, no vale la pena forzarlos a un solo componente.
- Vista mes: en mobile, tocar una celda cambia la lista de abajo (estado
  local); en desktop sigue navegando a la vista día como hoy. Mismo criterio
  de bifurcar, no unificar.
- FAB "Venta suelta" en mobile (position fixed); en desktop sigue en la
  toolbar como está.

### Fase D — Caja mobile

- `lib/cashbox.ts`: función pura nueva para agrupar movimientos por día
  (reusa `CashboxMovement[]`, ya tiene `.at`) + "mejor día"/"promedio por día
  abierto".
- `app/admin/caja/page.tsx`: tarjeta única de resumen en mobile (las tres
  tarjetas de escritorio quedan en `hidden md:grid`), lista en vez de tabla,
  y las vistas semana (barras) y mes (heatmap) nuevas en mobile.

### Fase E — Solicitudes mobile

- Chips de DNI/teléfono en la tarjeta (variante de `AppointmentCard` o
  tarjeta propia de solicitudes — a decidir al implementar, según cuánto
  diverja del resto).
- Hoja de rechazo con 3 chips de motivo predefinido que rellenan el textarea.

### Fase F — Servicios mobile

- FAB "Nuevo servicio" en mobile; botón de header en desktop.
- Switch de visibilidad dentro de un botón de área táctil 48×44.
- Hoja de servicio: duración como `<select>` de valores fijos en mobile
  (input libre en desktop, o se unifica si el `<select>` no pierde nada).

### Fase G — Disponibilidad mobile

La de mayor riesgo: cambia el modelo de guardado, no solo el estilo.

- Nueva Server Action (o ajuste de `saveBusinessHours`) para guardar un solo
  día desde la hoja.
- "Copiar este horario a todos los días": acción nueva o lógica en la misma
  acción con un flag.
- Ventana de reserva colapsada con su propia hoja (hoy es una `Card` siempre
  expandida).
- Barra fija de cambios sin guardar sobre la tab bar (reemplaza a los
  botones "Guardar" sueltos, sin tocar el desktop).

### Fase H — Estados transversales

- `loading.tsx` por ruta admin (Hoy, Agenda, Solicitudes, Caja) con
  esqueletos a la medida exacta de `n-CargaHoy`.
- `error.tsx` por ruta con el patrón de `n-ErrorCarga` (Reintentar = `reset()`
  de Next.js).
- Retrofit de los `toast.error(...)` existentes con acción "Reintentar"
  donde la nota lo pide — toca varios archivos (`appointment-actions.tsx`,
  `service-dialog.tsx`, `walk-in-sale-button.tsx`, `cancel-appointment-button.tsx`,
  `business-hours-form.tsx`).

## Decisiones a confirmar antes de tocar código

1. **Alcance de esta ronda**: ¿las 8 fases seguidas, o arrancamos por A+B
   (chrome + Hoy, la pantalla que más se usa) y las repasamos una por una,
   mismo ritmo que Fase 2?
2. **Toaster global**: ¿confirmás que el reposicionamiento de los avisos
   quede condicionado a `/admin` (el público sigue arriba-centro), en vez de
   cambiar la posición para todo el sitio?
3. **Disponibilidad (Fase G)**: ¿el guardado por día reemplaza a
   `saveBusinessHours` (una acción menos, dos formas de invocarla) o convive
   como una acción nueva separada? Lo relevante es que hoy guardar es
   atómico para las 7 filas y el wireframe pide guardar de a una.
