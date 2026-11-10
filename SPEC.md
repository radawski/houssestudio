# HOUSSESTUDIO — Spec de Fase 2

Cobros, cierre de caja y emails transaccionales, más autogestión de
cancelaciones. Continúa sobre Fase 1 (reservas públicas, agenda, servicios y
disponibilidad), ya completa y en producción de prueba.

## 0. Qué ya existe (no hay que rehacerlo)

El esquema y algunas piezas sueltas ya anticipaban esta fase; el trabajo real
es la capa de aplicación, no el modelado de datos desde cero:

- `payments` (una fila por turno, `amount` + `method` + `paid_at`), tipo
  `payment_method` (`efectivo` | `transferencia`) y `paymentSchema` en
  `lib/validation/schemas.ts` — **sin ningún código que los use todavía**.
- `email_log` con tipos `confirmacion` | `cancelacion` | `recordatorio` e
  índice único que impide un recordatorio duplicado por turno — **sin cliente
  de envío ni llamadas**.
- `settings.cancellation_window_hours` (default 2) y
  `DEFAULT_CANCELLATION_WINDOW_HOURS` en `lib/config.ts` — **sin lectura ni
  aplicación en ningún flujo**.
- `.env.local.example` ya reserva `RESEND_API_KEY`, `EMAIL_FROM` (Fase 2) y
  `CRON_SECRET` (Fase 3, no se toca ahora).
- El enum `appointment_status` incluye `completado` y `no_show`, pero **no
  existe ninguna transición hacia esos estados** en `lib/actions/appointments.ts`
  ni en la UI del panel.

## 1. Alcance de la fase

Dentro:

1. **Emails transaccionales** — confirmación al cliente, aviso interno al
   barbero, notificación de cancelación a ambos.
2. **Autogestión de cancelación** — el cliente cancela desde
   `/turno/[token]` respetando `settings.cancellation_window_hours`.
3. **Registro de cobros** — cerrar un turno como completado + cobrado
   (medio de pago, monto), y registrar ventas sueltas ("cortes sin turno").
4. **Cierre de caja** — reportes diario/semanal/mensual, calculados en el
   momento, desglosados por medio de pago, sobre cobros de turnos + ventas
   sueltas.

Fuera de alcance (Fase 3 u otra decisión explícita del usuario):

- Pasarela de pago online (Mercado Pago o similar) — hoy el registro de cobro
  es siempre manual, hecho por el barbero.
- Recordatorios automáticos, CRM y reportes históricos más allá de
  diario/semanal/mensual — quedan para Fase 3. (Actualizado: los
  recordatorios ya están hechos, el del día anterior en Fase 3 y "Ya pasó un
  mes" en octubre, ver §9; CRM y reportes siguen afuera.)
- Reprogramación de turnos por el cliente (solo puede cancelar).
- Gastos/egresos de caja — el cierre de esta fase es solo lo cobrado.

## 2. Decisiones fijadas (no volver a preguntarlas)

- Medios de pago: **efectivo y transferencia**, sin pasarela.
- Cierre de caja: **automático**, no hay un botón de "cerrar" que bloquee el
  período — es un reporte calculado sobre los datos existentes, en tres
  vistas (día, semana, mes).
- Emails: confirmación (cliente) + aviso de solicitud nueva (barbero) +
  notificación de cancelación (ambos), vía Resend, modo sandbox.
- Autogestión: el cliente **solo cancela**, no reprograma. Plazo mínimo =
  `settings.cancellation_window_hours` (arranca en 2, ya es el valor por
  defecto de la base — no hace falta inventar otro número).
- Ventas sueltas (actualizado en octubre de 2026, `tasks/plan-productos.md`):
  un **carrito solo de catálogo**. Se venden servicios (agrupados en la
  categoría fija "Cortes") y productos del catálogo de Más › Productos
  (categorías y productos con precio, migración 0012), con cantidades y
  varios ítems por venta, **al precio de lista**: sin monto editable ni
  producto de nombre libre. Cada ítem es una fila de `walk_in_sales`; los de
  una misma venta comparten `sale_id`. Las ventas de producto anteriores, de
  nombre libre, se agrupan en "Otros".
- Caja agrupa por categoría (Cortes, las de productos y Otros), en celular y
  escritorio, con desplegables que arrancan cerrados.
- Un turno cancelado que ya tenía cobro registrado no borra el pago: queda
  como dato histórico para el reporte de caja.
- Octubre de 2026 (`tasks/plan-mejoras-octubre.md`, detalle en §9):
  - Botón de WhatsApp solo en la portada y la reserva (no en `/turno`).
  - Cliente con número de otra zona: el peluquero lo carga en Más › Agregar
    cliente (hoja, sin restricción de zona, email opcional). Desde ahí reserva
    con su DNI; el control de zona no aplica al teléfono que ya figura en su
    ficha.
  - Recordatorio para volver: a quien tuvo su último turno **completado**
    hace entre 30 y 60 días y no tiene otro turno por delante. Solo cuenta
    `completado`: el peluquero registra el cobro de cada turno.
  - La baja corta solo ese recordatorio; los avisos de turnos (confirmación y
    recordatorio del día anterior) siguen llegando.

## 3. Cambios de datos (migración `0007_ventas_sueltas.sql`)

- **`walk_in_sales`** (tabla nueva): las ventas sueltas no encajan en
  `payments`, que exige `appointment_id not null unique` — una venta suelta no
  tiene turno.
  ```
  id            uuid primary key default gen_random_uuid()
  service_id    uuid references services(id) on delete set null
  service_name  text not null   -- copiado al momento, mismo criterio que appointments
  amount        numeric(10,2) not null check (amount >= 0)
  method        payment_method not null
  sold_at       timestamptz not null default now()
  note          text
  created_at    timestamptz not null default now()
  ```
  Índice por `sold_at` (mismo patrón que `payments_paid_at_idx`). RLS: mismo
  patrón `_admin_all` que el resto de las tablas del panel.
- Nada que tocar en `payments`, `email_log` ni `settings`: ya están listos.

## 4. Módulos, en orden de dependencia

### 4.1 `emails-transaccionales`

**Objetivo**: enviar y registrar los tres tipos de email.

**Alcance**:
- Cliente de Resend en `lib/email/resend.ts` (server-only, usa
  `RESEND_API_KEY`).
- Una función por tipo en `lib/email/send.ts`: `sendBookingConfirmation`,
  `sendNewRequestAlert` (al barbero, dirección propia — no depende de
  `email_log` porque no es un email al cliente), `sendCancellationNotice`.
- Cada envío al cliente escribe una fila en `email_log` (`type`, `to_email`,
  `status`, `provider_id`/`error`). Un fallo de envío **nunca** revierte la
  operación de negocio (reservar o cancelar sigue valiendo aunque el mail
  falle) — se registra el error en `email_log` y se sigue.
- Hooks: `createBooking` en `lib/actions/booking.ts` dispara confirmación +
  aviso interno tras el insert exitoso. `cancelAppointment` en
  `lib/actions/appointments.ts` (y la acción nueva de autogestión) disparan
  la notificación de cancelación.
- Plantillas simples en español rioplatense, texto plano o HTML mínimo — sin
  librería de templating nueva.

**Criterios de aceptación**:
- Reservar un turno manda un email al cliente con fecha, hora, servicio y el
  link de `/turno/[token]`, y otro al barbero con los mismos datos.
- Cancelar un turno (desde el panel o desde autogestión) manda notificación a
  cliente y barbero.
- Un error de Resend (API caída, dirección inválida) no impide que la reserva
  o la cancelación se guarden; queda logueado en `email_log` con
  `status = 'error'`.
- En sandbox, los mails llegan a la casilla propia del desarrollador, no a la
  del cliente real — comportamiento esperado del modo sandbox, no un bug.

**Fuera de alcance**: recordatorios (Fase 3, ya tiene el hueco de idempotencia
reservado en `email_log`).

### 4.2 `autogestion-cancelacion`

**Depende de**: 4.1 (dispara el email de cancelación).

**Objetivo**: que el cliente cancele su propio turno desde su link.

**Alcance**:
- Nueva Server Action `cancelByToken(token, reason?)` en
  `lib/actions/booking.ts` (mismo archivo que el resto de las acciones del
  portal público, sin sesión admin).
- Valida: el turno existe, está en `pendiente` o `confirmado`, y
  `now() < starts_at - cancellation_window_hours`. Fuera de la ventana,
  devuelve un mensaje claro derivando a coordinar por WhatsApp (mismo patrón
  que `fuera_de_area` en `booking.ts`), no un error genérico.
- UI: botón "Cancelar turno" en `app/turno/[token]/page.tsx`, visible solo si
  el turno está en un estado cancelable y dentro de la ventana. Confirmación
  antes de ejecutar (mismo patrón de diálogo que
  `CancelAppointmentButton`, pero como componente cliente propio ya que este
  no requiere sesión admin).
- `cancelled_by = 'cliente'` al registrar la baja.

**Criterios de aceptación**:
- Dentro de la ventana: el cliente cancela, el slot vuelve a la grilla
  pública al instante (ya lo garantiza la restricción de exclusión), y ambas
  partes reciben el email de cancelación.
- Fuera de la ventana: no se ofrece el botón, o al intentar se explica el
  motivo y se deriva a WhatsApp — nunca un cambio de estado silencioso.
- Un turno ya `completado`, `cancelado` o `no_show` no muestra el botón.

### 4.3 `registro-de-cobros`

**Objetivo**: cerrar la atención de un turno (completado + cobrado) y
registrar ventas sueltas.

**Alcance**:
- `completeAppointment(id, payment)` en `lib/actions/appointments.ts`: en una
  sola operación, actualiza `appointments.status = 'completado'`,
  `completed_at`, e inserta la fila en `payments` (usa `paymentSchema`, que ya
  existe). Solo válido desde `confirmado`.
- `markNoShow(id)`: transición a `no_show`, sin pago. Solo válido desde
  `confirmado` y con `starts_at` ya pasado (no se puede marcar ausente a
  alguien que todavía no tenía que llegar).
- `recordWalkInSale(input)` en `lib/actions/sales.ts`: recibe los ítems del
  carrito (tipo, id y cantidad, sin precios) y los registra con la función
  `record_walk_in_sale` (migración 0012), que toma nombre y precio del
  catálogo en una sola transacción. (Hasta la 0012 era un solo ítem con
  monto editable o un producto de nombre libre.)
- UI: en `AppointmentCard`/`appointment-actions.tsx`, reemplazar o extender
  las acciones disponibles sobre un turno `confirmado` para incluir "Marcar
  cobrado" (abre diálogo con monto sugerido = `price_at_booking` y selector de
  medio de pago) y "Marcar ausente". Nueva sección en `/admin/agenda` o una
  pestaña dedicada para "Venta suelta".

**Criterios de aceptación**:
- Marcar un turno `confirmado` como cobrado lo pasa a `completado` y crea el
  pago en la misma operación; no queda un estado intermedio "completado sin
  pago".
- Un turno ya `completado` no puede volver a cobrarse (el `unique` en
  `payments.appointment_id` lo impide a nivel de base; la UI no debe ni
  ofrecer la acción).
- Registrar una venta suelta no requiere turno ni cliente identificado.

**Fuera de alcance**: edición o borrado de un cobro ya registrado — un error
de tipeo se corrige a mano desde Supabase por ahora.

### 4.4 `cierre-de-caja`

**Depende de**: 4.3.

**Objetivo**: ver cuánto se cobró, desglosado por medio de pago, en tres
ventanas de tiempo.

**Alcance**:
- `lib/data/cashbox.ts` (nuevo): funciones puras de lectura
  `getCashboxSummary(range)` que combinan `payments` (join `appointments`
  para fecha/servicio) + `walk_in_sales` dentro del rango, agrupando por
  `method` y totalizando.
- Función pura de agregación en `lib/cashbox.ts` (testeable sin Supabase,
  mismo patrón que `lib/availability.ts`): recibe una lista de cobros
  (`{amount, method}[]`) y devuelve el desglose + total.
- Página nueva `app/admin/caja/page.tsx` con selector día/semana/mes
  (reutilizar el patrón de navegación de `agenda-toolbar.tsx` si aplica) y
  tabla de movimientos del período (turno u origen "venta suelta", servicio,
  medio de pago, monto).

**Criterios de aceptación**:
- El resumen diario de una fecha con turnos cobrados y ventas sueltas suma
  ambos correctamente, desglosado por `efectivo` y `transferencia`.
- Cambiar de vista (día → semana → mes) recalcula sobre el mismo dato, sin
  updates ni tablas de "cierre" separadas.
- Un turno cancelado nunca aparece en el total, aunque haya tenido un pago
  registrado antes de cancelarse (caso ya cubierto por la decisión de no
  borrar el pago histórico: se excluye por join con `appointments.status`,
  no por borrado).

## 5. Comandos

Los mismos de siempre, sin agregados:

```bash
npm run dev
npm test
npm run typecheck
npm run build
```

Nuevo antes de empezar: `npm install resend`, completar `RESEND_API_KEY` y
`EMAIL_FROM` en `.env.local` (sandbox), y aplicar la migración de cada
módulo desde el SQL Editor a medida que se implementa.

## 6. Estilo de código (recapitulando lo ya vigente, no hay reglas nuevas)

- Server Actions en `lib/actions/`, una por dominio, `"use server"` arriba.
  Las del portal público devuelven `ActionState` (para `useActionState`); las
  del panel admin (llamadas desde componentes cliente con `useTransition`)
  tiran `Error` y el componente lo atrapa con `toast`.
- Lecturas en `lib/data/`, siempre `server-only`, nunca desde un componente
  cliente.
- Zod en `lib/validation/schemas.ts`, compartido entre formulario y servidor.
- Comentarios solo para el porqué no obvio (igual que el resto del código
  existente) — no para describir qué hace la línea.
- Español rioplatense (voseo) en toda la interfaz y en los emails.
- Ninguna clave (`RESEND_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) sale de un
  módulo server-only.

## 7. Estrategia de testing

- Vitest para toda lógica pura, mismo patrón que `lib/availability.test.ts` y
  `lib/phone.test.ts`:
  - Agregación de caja (`lib/cashbox.ts`): desglose por medio de pago, suma de
    turnos + ventas sueltas, exclusión de cancelados.
  - Cálculo de ventana de cancelación (dado `starts_at` y
    `cancellation_window_hours`, ¿se puede cancelar ahora?).
- Sin infraestructura de e2e en el proyecto: cada módulo se verifica a mano
  con `npm run dev` contra el proyecto de Supabase real (sandbox de Resend
  para no mandar mails de verdad) antes de darlo por terminado.
- `npm run typecheck` y `npm test` en verde antes de cerrar cada módulo.

## 8. Límites

**Siempre**:
- Mantener el patrón de una sola superficie de escritura pública (Server
  Actions con `service_role`, RLS activo, `anon` sin políticas).
- Congelar `service_name`/`amount` al momento de la venta suelta, igual que
  `service_name_at_booking` en turnos — no referenciar el precio vigente del
  catálogo por si cambia después.

**Preguntar antes**:
- Antes de aplicar una migración contra el proyecto de Supabase real (no es
  un entorno de prueba descartable). El número de archivo concreto de cada
  módulo se decide al implementarlo, no acá.
- Antes de instalar cualquier dependencia nueva más allá de `resend`.
- Si alguna decisión de la sección 2 necesita cambiar sobre la marcha.

**Nunca**:
- Integrar una pasarela de pago online en esta fase.
- Borrar o editar un pago ya registrado desde código de la aplicación.
- Exponer `RESEND_API_KEY` o `SUPABASE_SERVICE_ROLE_KEY` a un componente
  cliente.

## 9. Actualización de octubre de 2026 (`tasks/plan-mejoras-octubre.md`)

Construido sobre Fase 2 y Fase 3, con los diseños "Botón WhatsApp",
"Recordatorio de turno" y "Estados de carga — Admin".

**Reserva pública**
- "Confirmar turno" muestra "Confirmando…" y bloquea los botones; los mails
  1a y 2a salen con `after()`, así el redirect no espera a Resend.
- "Turno solicitado" termina con "Volver al inicio".
- Pasar la portada con el dedo la retira igual que "Reservar turno", sin
  salto (`lib/hero-scroll.ts`).
- Botón flotante de WhatsApp (`components/public/whatsapp-fab.tsx`): blanco
  sobre la portada, tinta sobre el papel; sin `settings.phone` no aparece.

**Clientes de otra zona**
- `isBookablePhone` (`lib/phone.ts`): los números del área siempre; de otra
  zona, solo el que ya figura en la ficha de ese DNI. Lo aplican
  `createBooking` y `DniGate`.
- El mensaje de "Coordinar por WhatsApp" lleva nombre, DNI, teléfono y email
  (`lib/out-of-area-message.ts`).
- Más › Agregar cliente (`addCustomer`, `customerSchema`): si el DNI ya
  tenía ficha la actualiza; un email vacío no borra el que tenía.

**Estados de carga del panel**
- Agenda y Caja navegan sin esperar al servidor (`PeriodNavigation`): la vista
  y la fecha tocadas se guardan con `useOptimistic`, el toolbar responde en el
  mismo toque y el cuerpo muestra su esqueleto mientras lo pedido no coincida
  con lo que trajo el servidor. Sin `Suspense` del servidor.
- El esqueleto aparece a los 200 ms (CSS, aparte del pulso para que
  "Reducir movimiento" no lo apague) y dura al menos 400 ms
  (`lib/loading-hold.ts`). Semana, Mes y Caja muestran desde el primer cuadro
  lo que no depende de datos (días, grilla, etiquetas); en Caja nunca queda
  un monto viejo ni `$ 0`.
- ◀ ▶ en Mes van al día 1 del mes vecino; "Hoy" se deshabilita cuando el
  período a la vista ya contiene hoy (`lib/period-nav.ts`).
- Más pinta sus filas al toque y la sesión carga (o falla, con "Reintentar")
  sola en su tarjeta; sesión vencida va al login (`lib/session-state.ts`).
- Servicios, Productos y Disponibilidad tienen `loading.tsx`. Su ← vuelve a
  Más con `router.back()` si se llegó desde Más (`NavigationTracker`,
  `lib/mas-return.ts`) y marca 600 ms la fila de origen.

**Recordatorio para volver (1d)**
- Migraciones 0013 (valor `vuelta` de `email_type`) y 0014
  (`customers.comeback_opt_out_at` + `email_log_comeback_once_idx`).
- `pickComebacks` (`lib/comebacks.ts`) elige; `getComebackInputs` lee con
  `service_role`; `sendComeback` reserva la fila de `email_log` antes de
  mandar, así el índice único impide un segundo envío por visita.
- La tarea diaria (`/api/cron/reminders`, 10 de Buenos Aires) corre el
  recordatorio del día anterior y este, aislados (`runIsolated`).
- Baja en `/baja/<id>.<firma>` (HMAC con propósito propio sobre
  `MANAGE_TOKEN_SECRET`): abrir el link no cambia nada, la baja es el botón.

## 10. Actualización de noviembre de 2026 (`tasks/plan-mejoras-noviembre.md`)

Construida sobre el prototipo aprobado el 2026-11-09
(https://claude.ai/artifact/FXxvsmpuobzM89xRqmRhvf). La app ya se usa en
producción, así que todas las migraciones son **solo aditivas**: columnas y
tablas nuevas, nunca borrar ni renombrar. Las aplica el usuario en el SQL
Editor antes del deploy.

**Decisiones del usuario (no volver a preguntarlas)**
- "Mis turnos": el cliente se identifica con DNI + teléfono.
- Turno fijo: cada 1, 2 o 3 semanas, o cada mes (el mismo n-ésimo día de la
  semana; si el mes no tiene quinto, el último). Siempre 4 fechas agendadas,
  confirmadas. Una fecha ocupada se saltea y queda un aviso en Hoy. Las fechas
  generadas no mandan mail de confirmación (solo el recordatorio del día
  anterior) y terminar un turno fijo no le avisa al cliente.
- Pago dividido: en el cobro de turnos y en las ventas sueltas.
- Motivo de cancelación: opcional, pero visible en el panel.
- Turno manual: solo horarios de la grilla de la reserva online.
- Faltas: cuenta solo "No vino" (`no_show`).
- Estadísticas: ingresos, turnos y faltas, clientes (sin ranking de los que
  más vienen), "Mismo día, semana a semana" con +n / −n (sin porcentajes),
  frecuencia media de retorno y movimiento por día y hora.
- Portada: "Barbería" y el título en Anton a 56 px. "Barbería" también en el
  encabezado de los mails al cliente y en la descripción del sitio.

**Cliente: "Mis turnos" (`/mis-turnos`)**
- `lookupMyAppointments` compara DNI y teléfono (`phonesMatch`), con límite de
  5 intentos por minuto por IP y por DNI y un error genérico que no dice si el
  DNI existe. Va por POST (`useActionState`): los datos nunca quedan en la URL.
- La sesión es una cookie `mis_turnos` httpOnly de 30 minutos
  (`<cliente>.<vence>.<firma>`, HMAC con propósito propio). Desde un turno de
  esa sesión, `/turno/[token]` muestra "Volver a mis turnos".

**Panel: ver lo que ya estaba en la base**
- La Agenda del día muestra los cancelados tachados con su motivo.
- El chip "Faltó N veces · última d/M" (o "Primera vez") aparece en Hoy,
  Solicitudes, la Agenda y la hoja del turno (`lib/no-shows.ts`).
- La hoja del turno suma "Ver ficha", Cobrar / No vino y Cancelar / Rechazar.
- Clientes (`/admin/clientes`): buscador por nombre, DNI o teléfono; ficha con
  datos editables, notas privadas, contadores, turno fijo e historial.
- Las hojas inferiores se cierran deslizando hacia abajo (`lib/sheet-drag.ts`).

**Pago dividido (migración `0016_pago_dividido.sql`)**
- `payments` y `walk_in_sales` suman `cash_amount` y `transfer_amount`, los dos
  nulos en un cobro de un solo método. Un check exige que sumen `amount`.
- `method` guarda el método del monto mayor. Toda suma por método pasa por
  `amountsByMethod` (`lib/cashbox.ts`), que usa la división si existe.
- RPC `complete_appointment_with_split_payment` y `record_walk_in_sale_split`
  (reparte el efectivo entre los ítems en proporción).

**Turno manual y turno fijo (migración `0017_turnos_fijos.sql`)**
- "+ Nuevo" en la Agenda abre "Nuevo turno" o "Venta suelta". El turno queda
  confirmado; la grilla es la de la reserva, sin el límite de días ni la
  anticipación mínima (`getAvailableSlots(..., { ignoreBookingWindow })`).
- `recurring_appointments` guarda la regla; `appointments.recurring_id` liga
  cada fecha generada; el índice único `(recurring_id, starts_at)` impide
  duplicados. `recurring_skips` guarda las fechas salteadas con su motivo.
- `fillRecurring` (`lib/data/recurring.ts`) completa las próximas 4 fechas.
  No usa la grilla (se corre con cada reserva): alcanza con que el horario
  caiga dentro de la atención y no pise un bloqueo ni otro turno
  (`occurrenceProblem`, `lib/recurring.ts`). Es idempotente: cada fecha se
  resuelve una vez, aunque se cancele después.
- La tarea diaria corre `turnos-fijos` antes de los recordatorios.
- Hoy muestra cada fecha salteada con "Elegir otro horario" (abre "Nuevo
  turno" con el cliente puesto) o "Saltear esa fecha". La ficha permite
  Pausar, Reanudar y Terminar (cancela las fechas futuras con el motivo "Fin
  de turno fijo").

**Estadísticas (`/admin/estadisticas`)**
- Por semana o mes, con la misma navegación sin espera que Agenda y Caja.
- Los ingresos se cuentan como en Caja, por el día del cobro. Los turnos, las
  visitas y el mapa de movimiento, por el día del turno.
- Frecuencia media de retorno: solo clientes activos (2 o más visitas y la
  última hace menos de 60 días, el corte de `COMEBACK_MAX_DAYS`); cada cliente
  aporta su promedio propio.
- Los cálculos son puros (`lib/stats.ts`) y las lecturas, paginadas de a 1000
  filas (`lib/data/stats.ts`).

**Pendiente**
- V2: migración `0015` con `appointments.no_show_at` para que el historial del
  turno muestre cuándo se marcó la falta. El número 0015 queda reservado.

