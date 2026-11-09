# Plan — Clientes, pago dividido, turnos manuales y fijos, "Mis turnos" y estadísticas

## Contexto

El peluquero empieza a usar la app ya, y estas mejoras se suman después **sin tocar los turnos
agendados**. El usuario pidió 8 cambios: pago dividido efectivo/transferencia, ficha de cliente
con historial y faltas, aviso de "no vino" en Agenda y Solicitudes, sección "Mis turnos" para el
cliente con cancelación, motivo de cancelación visible, agendar turnos a mano buscando al cliente,
turno fijo y estadísticas. Antes de escribir código se arma un **prototipo navegable (Artifact)**
de todas las pantallas nuevas o modificadas para ajustarlas con el usuario.

## Lo que encontré en el código (y simplifica el plan)

1. `no_show` ya existe y "No vino" ya se marca (`MarkNoShowButton`, `markNoShow` en
   `lib/actions/appointments.ts:120`), pero solo desde Hoy y la vista día de escritorio. No guarda
   cuándo se marcó, así que el historial del turno se corta ahí.
2. `cancellation_reason` ya se guarda en los dos caminos (sheet "Rechazar/Cancelar" con
   `QUICK_REASONS` y `cancelByToken` del cliente), y `AppointmentCard`/`AppointmentSheet` ya saben
   mostrarlo. No se ve porque `getAppointmentsBetween` filtra `.neq("status","cancelado")`
   (`lib/data/appointments.ts:69`) y Solicitudes solo lista pendientes.
3. No hay lista de clientes ni ficha. `customers.notes` existe y no se usa. El índice
   `appointments_customer_idx (customer_id, starts_at desc)` ya permite el historial por cliente.
4. `payments` tiene `appointment_id unique`: un solo método por turno. Las ventas sueltas
   (`walk_in_sales`) guardan un método por ítem. La caja suma por método en `lib/cashbox.ts`
   (`summarizeCharges`, `groupByCategory`).
5. La página `/turno/[token]` ya muestra el estado y cancela dentro de la ventana. El link se
   reconstruye con `manageUrlFor(id)` (`lib/tokens.ts:63`). Por eso "Mis turnos" solo tiene que
   listar y enlazar a esa página, sin un flujo de cancelación nuevo.
6. Para reservar ya existen `getAvailableSlots`, la restricción `appointments_no_overlap`
   (error `23P01`) y el upsert de cliente por DNI (`addCustomer`, `lib/actions/customers.ts`).
   El turno manual y el fijo se apoyan en eso.
7. Ya hay una tarea diaria (`app/api/cron/reminders/route.ts` con `runIsolated`). El generador
   del turno fijo es un tercer paso en esa misma ruta, sin cron nuevo.
8. Las migraciones se pegan a mano en el SQL Editor de Supabase. Esa base es la misma que la de
   producción.

## Decisiones confirmadas por el usuario (2026-11-07)

1. **Mis turnos:** el cliente se identifica con **DNI + teléfono**, con límite de intentos.
2. **Turno fijo:** cada **1, 2 o 3 semanas, o cada mes**. "Cada mes" es el mismo n-ésimo día de
   la semana (ej.: el 2° miércoles); si un mes no tiene 5° día, se usa el último. Se generan las
   próximas 4 fechas ya confirmadas, y la tarea diaria va sumando. (Ampliado el 2026-11-09 desde
   el prototipo.)
3. **Choques del turno fijo:** esa fecha **se saltea y queda un aviso** para el peluquero.
4. **Pago dividido:** al cobrar turnos **y** en ventas sueltas.
5. **Motivo de cancelación:** sigue **opcional**. Los cancelados y su motivo pasan a verse en el admin.
6. **Turno manual:** **solo horarios de la grilla**, los mismos que ofrece la reserva online.
7. **Faltas:** cuenta **solo "No vino"**.
8. **Estadísticas:** ingresos, turnos y faltas, clientes, y días/horas con más movimiento.

## Reglas para no afectar los turnos agendados

- Migraciones **solo aditivas** (`0015+`): columnas y tablas nuevas. No se borran ni renombran
  columnas ni enums.
- Cada migración se aplica **antes** del deploy y tiene que ser compatible con el código que está
  publicado en ese momento.
- Antes de cada migración, respaldo con `npm run db:vaciar -- --simular`: respalda sin borrar.
- Pruebas contra la base real solo con reservas de prueba, borradas al terminar.

## Tareas

### Fase 0 — Prototipo (antes de escribir código)

#### D1 — Prototipo navegable en un Artifact (M)
Un único HTML con marco de iPhone 390×844, el sistema de diseño de `design/admin-iphone`
(`n-sistema`, `n-hojas`, `n-estados`; tokens de `app/tokens.css`) y navegación entre pantallas:
- **Admin**
  - Agenda día: cancelados tachados con su motivo, chip "Faltó N veces" y botón "+" con
    "Turno" o "Venta".
  - Solicitudes con el chip de faltas.
  - Hoja "Nuevo turno": buscar cliente o crear uno, servicio, fecha, horario de la grilla y
    "Repetir: no / 1 sem / 2 sem / 3 sem / mes".
  - Aviso de fecha salteada de un turno fijo.
  - Hoja "Cobrar" con el pago dividido, y el carrito de venta suelta con el pago dividido.
  - Más → Clientes (lista con buscador), Ficha de cliente (datos, notas, faltas, turnos fijos,
    historial) y Más → Estadísticas.
- **Cliente:** acceso "Mis turnos" en la portada, formulario DNI + teléfono, lista de turnos
  (próximos y pasados con su estado) y el enlace a la página del turno para cancelar.

**Aceptación:** el usuario recorre todas las pantallas en el celular y aprueba o pide cambios. Se
itera sobre el mismo Artifact. Recién con el OK pasa a código.

**Estado: aprobado el 2026-11-09.** Prototipo: https://claude.ai/artifact/FXxvsmpuobzM89xRqmRhvf.
Es la referencia visual de cada tarea. Los ajustes que salieron de los comentarios ya están
volcados en las tareas de abajo:
- Agenda y Venta suelta se rehicieron sobre el código actual (`agenda-views.tsx`,
  `agenda-toolbar.tsx`, `walk-in-sale-button.tsx`). Lo nuevo va encima de esa UI, sin cambiarla.
- Hoja del turno: botón "Cancelar turno" (→ V3).
- Nuevo turno: flechas para pasar de semana y repetir cada 1/2/3 semanas o cada mes (→ T1, T2).
- Estadísticas: sin "los que más vienen"; suman "Mismo día, semana a semana" y "Frecuencia media
  de retorno" (→ E1).
- Portada: "Barbería" y el título en Anton (→ B1).

### Fase 1 — Ver lo que ya está en la base (sin cambiar datos de turnos)

#### V1 — Cancelados y su motivo en la Agenda (S)
`getAppointmentsBetween` admite incluir cancelados, y la vista día los muestra atenuados y
tachados con su motivo. Hoy y el conteo de turnos siguen sin contarlos.
**Archivos:** `lib/data/appointments.ts`, `app/admin/agenda/agenda-views.tsx`,
`components/admin/appointment-sheet.tsx`.

#### V2 — Faltas en Agenda, Hoy y Solicitudes (S)
- Nueva consulta `getNoShowCounts(customerIds)`: una sola consulta por pantalla.
- Chip "Faltó 1 vez" / "Faltó N veces · última dd/mm" en `RequestCard`, `AppointmentCard`,
  `AgendaAppointmentRow` y la hoja del turno.
- La lógica pura va en `lib/no-shows.ts` (+ test).
- **Pendiente:** migración `0015`, `appointments.no_show_at timestamptz` (nullable). `markNoShow`
  la completaría y el historial del turno la mostraría. Se dejó para después porque requiere
  aplicar SQL a mano en Supabase antes del deploy; las faltas se cuentan igual con el estado
  `no_show`.

**Archivos:** `lib/data/appointments.ts`, `lib/actions/appointments.ts`,
`lib/appointment-timeline.ts`, `app/admin/solicitudes/request-card.tsx`,
`components/admin/appointment-card.tsx`, `supabase/migrations/0015_no_show_at.sql`.

#### V3 — Acciones en la hoja del turno: Cobrar, No vino y Cancelar (S)
- La hoja del turno (la que abre la Agenda del celular) suma "Cobrar" y "No vino" cuando
  `canMarkNoShow` lo permite. Así no depende solo de Hoy.
- Suma "Cancelar turno" (borde gris, texto rojo) para turnos pendientes o confirmados. Abre el
  mismo paso que `CancelAppointmentButton`: "Motivo (opcional)", `QUICK_REASONS`, confirmación en
  rojo y "Volver". Nunca cancela de un toque.

**Archivos:** `components/admin/appointment-sheet.tsx`, `components/admin/appointment-actions.tsx`.

#### C1 — Clientes: lista y ficha (M)
- `/admin/clientes`: buscador por nombre, DNI o teléfono. Usa los índices existentes
  `lower(full_name)` y `customers_phone_idx`.
- `/admin/clientes/[id]`: datos editables (reusa `customerSchema`/`addCustomer`), notas
  (`customers.notes`), contadores (visitas, faltas, cancelaciones, gastado), turnos fijos e
  historial con estado y motivo.
- Entrada en `MasRows`, `MAS_PREFIXES` (`admin-tab-bar.tsx:25`) y `AdminNav`. La ficha usa
  `BackHeader`.
- El nombre del cliente en la hoja del turno enlaza a su ficha.

**Archivos:** `app/admin/clientes/**` (nuevo), `lib/data/customers.ts` (nuevo),
`lib/actions/customers.ts`, `lib/customer-summary.ts` (nuevo, + test).

**Checkpoint 1:** `npm test`, typecheck, lint, build. El usuario lo prueba en el iPhone.

### Fase 2 — Pago dividido

#### P1 — Migración compatible (S, riesgo alto)
**Hecho (2026-11-09), con otro diseño, más seguro que el original.** En vez de cambiar la
restricción `unique(appointment_id)` y sumar una tabla, la migración `0016_pago_dividido.sql`
solo **agrega**:
- Las columnas opcionales `cash_amount` y `transfer_amount` en `payments` y en `walk_in_sales`.
  Quedan en null en un cobro de un solo método, como todos los anteriores. En uno dividido, una
  restricción exige que sumen `amount`, y `method` guarda el método del monto mayor.
- `complete_appointment_with_split_payment(p_appointment_id, p_cash, p_transfer)`.
- `record_walk_in_sale_split(p_items, p_cash, p_note)`, que reparte el efectivo entre los ítems
  en proporción para que la Caja por categoría cierre al centavo.

Probada en PGlite: es idempotente, no cambia los cobros viejos y 300 ventas al azar cuadran.
Aplicada por el usuario en Supabase y verificada en la base real.

#### P2 — Cobrar y venta suelta con dos montos (M)
- El selector de método pasa a ofrecer "Efectivo / Transferencia / Dividido". Con "Dividido"
  aparecen dos montos que se completan solos para sumar el total.
- La caja (`lib/data/cashbox.ts`, `lib/cashbox.ts`) suma por método desde las filas de pago.
- `AppointmentSheet` muestra "Efectivo $X + Transferencia $Y".
- El embed `payment` pasa a `payments[]`.

**Archivos:** `components/admin/appointment-actions.tsx`, `components/admin/walk-in-sale-button.tsx`,
`lib/actions/{appointments,sales}.ts`, `lib/validation/schemas.ts`, `lib/data/{appointments,cashbox}.ts`,
`lib/cashbox.ts` (+ test), `app/admin/caja/*`, `lib/supabase/database.types.ts`.

**Checkpoint 2:** la caja de días ya cobrados da los mismos totales antes y después de la
migración (se compara la caja del último mes).

### Fase 3 — Turno manual y turno fijo

#### T1 — "Nuevo turno" desde el admin (M)
- El botón flotante de la Agenda pasa de "+ Venta suelta" a "+ Nuevo", con el mismo lugar y la
  misma forma. Al tocarlo abre un menú con "Nuevo turno" y "Venta suelta".
- Hoja con estos pasos: cliente (búsqueda por nombre, DNI o teléfono, o "Cliente nuevo" con los
  campos de `AddCustomerSheet`), servicio, fecha, y horarios de `getAvailableSlots` (solo la
  grilla, sin el límite de `max_booking_days`).
- La fecha se elige en una tira de martes a sábado, con flechas ‹ › para pasar de semana y la
  semana a la vista ("· 17 al 21 nov"). No se puede ir antes de la semana actual.
- Crea el turno **confirmado**, con token como `createBooking`, y manda el mail de confirmación si
  el cliente tiene email.
- Un horario ocupado (`23P01`) muestra "Ese horario acaba de ser tomado".
- La lógica de inserción se extrae de `createBooking` a `lib/booking/insert-appointment.ts`, que
  queda compartida.

**Archivos:** `components/admin/new-appointment-sheet.tsx` (nuevo), `lib/actions/admin-booking.ts`
(nuevo), `lib/actions/booking.ts`, `app/admin/agenda/agenda-toolbar.tsx`.

#### T2 — Turno fijo (M, riesgo alto)
- Migración `0017`: tabla `recurring_appointments` (cliente, servicio, día de semana, hora,
  frecuencia `semanas` 1–3 o `mensual` con su n-ésimo día, desde, activo) y
  `appointments.recurring_id` (nullable, `on delete set null`).
  Tabla `recurring_skips` (fecha y motivo, resuelto sí/no) con RLS de admin.
- "Repetir" en la hoja de T1. Al crear, se generan las próximas 4 fechas como confirmadas.
- La tarea diaria suma un paso `turnos-fijos` con `runIsolated` que mantiene siempre 4 fechas
  futuras agendadas. Si una fecha está ocupada, se saltea, se registra en `recurring_skips` y aparece el
  aviso en Hoy.
- La ficha del cliente permite pausar o terminar el turno fijo. Las fechas futuras ya generadas
  se cancelan con el motivo "Fin de turno fijo".
- La lógica pura (próximas fechas, intervalo y choques) va en `lib/recurring.ts` (+ test).
- Cada ocurrencia es un turno normal: tiene recordatorio, "Mis turnos" y se cancela sola.

**Archivos:** `supabase/migrations/0017_turnos_fijos.sql`, `lib/recurring.ts`,
`lib/data/recurring.ts`, `lib/actions/recurring.ts`, `app/api/cron/reminders/route.ts`,
`app/admin/(hoy)/page.tsx`, ficha de cliente.

**Checkpoint 3:**
- Crear un turno fijo de prueba que choque con un bloqueo y verificar que esa fecha se saltea con
  aviso.
- Correr la tarea diaria y verificar que no duplica turnos.
- Borrar los datos de prueba.

### Fase 4 — "Mis turnos" del cliente

#### M1 — Consulta con DNI + teléfono (S)
- Acción `lookupMyAppointments(dni, phone)`:
  - Normaliza el teléfono con `checkPhone`, que deja los 10 dígitos nacionales, y lo compara con
    la ficha.
  - Límite de 5 intentos por minuto por IP y por DNI.
  - El mensaje de error es genérico ("No encontramos turnos con esos datos") y no dice si el DNI
    existe.
  - Devuelve los próximos turnos y los últimos 5 pasados, cada uno con `manageUrlFor(id)`.

#### M2 — Pantalla `/mis-turnos` (S)
- Formulario DNI + teléfono (ayuda: "Con característica, sin 0 ni 15. Ej.: 342 597 2035"), y la
  lista con fecha, servicio y estado (`StatusBadge`).
- Cada turno enlaza a `/turno/[token]`, donde ya se ve el detalle y se cancela.
- El acceso se suma en la portada, debajo de "Reservar turno", y en la barra superior de
  `/turno`.
- Al identificarse queda una sesión corta (cookie firmada `httpOnly`, 30 minutos) con el id del
  cliente, nunca el DNI ni el teléfono. Así, desde un turno, "Volver a mis turnos" (arriba y
  abajo en `/turno`) y el botón "atrás" vuelven a la lista sin pedir los datos. "Salir" la
  cierra. (Pedido del usuario el 2026-11-09.)

**Archivos:** `app/mis-turnos/page.tsx` (nuevo), `components/public/my-appointments.tsx` (nuevo),
`lib/actions/my-appointments.ts` (nuevo), `components/public/site-hero.tsx`.

#### B1 — Portada: "Barbería" y título en Anton (XS)
- El texto chico sobre el título pasa de "Peluquería" a "Barbería".
- "HOUSSESTUDIO" se muestra en Anton (Google Fonts, cargada con `next/font/google` solo para el
  título) a 56 px, peso 400. El tamaño mantiene el `clamp` actual para pantallas de 320 px.
- Pendiente de confirmar con el usuario: si "peluquería" también cambia en los otros ~7 lugares
  (textos y mails).

**Archivos:** `components/public/site-hero.tsx`, `app/layout.tsx` o el propio hero (fuente).

**Checkpoint 4:** con un DNI real y un teléfono equivocado no muestra nada. A los 5 intentos se
bloquea. Cancelar desde la lista funciona.

### Fase 5 — Estadísticas

#### E1 — `/admin/estadisticas` (M)
- Período semana o mes con `PeriodNavigation`.
- **Ingresos:** total, efectivo y transferencia, y la variación contra el período anterior.
- **Turnos:** atendidos, cancelados, "no vino" y su porcentaje.
- **Clientes:** nuevos contra los que vuelven. No se muestra quiénes son los que más vienen
  (decisión del usuario).
- **Frecuencia media de retorno:** "Cada N días", con la diferencia en días contra el período
  anterior (verde si bajó) y barras por rango (<15, 15–30, 31–45, 46–60 días). Cuenta solo a los
  clientes activos: 2 o más visitas y la última hace menos de 60 días, el mismo corte que
  `COMEBACK_MAX_DAYS`. Leyenda: "Cuántos días pasan, en promedio, hasta que un cliente vuelve."
- **Mismo día, semana a semana:** se elige el día (lun a sáb) y si se miran ingresos o turnos.
  Muestra el último de ese día contra el mismo día de las 7 semanas anteriores: una barra por
  semana, la diferencia con la semana previa como +n / −n (sin porcentajes), la diferencia con el
  promedio y una línea que marca el promedio.
- **Movimiento:** mapa día × hora de turnos atendidos.
- Los cálculos son funciones puras en `lib/stats.ts` (+ test). Reusa `summarizeCharges` y
  `buildDayRevenues`.

**Archivos:** `app/admin/estadisticas/**` (nuevo), `lib/data/stats.ts`, `lib/stats.ts`,
`app/admin/mas/mas-rows.tsx`.

### Fase final

#### F1 — SPEC, README y todo.md al día (XS)

## Dependencias

```
D1 ──► todo
V2 ──► C1 (contadores de faltas)
C1 ──► T1 (búsqueda de cliente) ──► T2
P1 ──► P2 ──► E1 (ingresos por método)
M1 ──► M2   (independiente del resto)
B1          (independiente; puede ir junto con M2, que también toca la portada)
```

## Riesgos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| La migración de pagos rompe la caja actual | Alto | Constraint compatible, RPC viejas vivas hasta el deploy, comparar totales del último mes |
| Turno fijo genera duplicados | Alto | Índice único `(recurring_id, starts_at)` y generación idempotente con test |
| Fuerza bruta en Mis turnos | Medio | DNI + teléfono, límite por IP y por DNI, error genérico |
| El límite en memoria se reinicia con cada instancia | Bajo | Aceptado como hoy en la reserva; mover a la base si hay abuso |
| Probar contra la base de producción | Medio | Respaldo antes de migrar, datos de prueba borrados al terminar |

## Verificación

- En cada tarea: `npm test`, `npx tsc --noEmit`, `npm run lint` y `npm run build`.
- Vista previa local (`dev` en `.claude/launch.json`) a 390 px en el navegador integrado:
  recorrer cada flujo nuevo.
- En cada checkpoint, el usuario prueba en el iPhone (16 Pro / 13 Pro).
- Comprobar que los turnos agendados antes de cada migración se siguen viendo, se cobran y se
  cancelan igual que antes.
