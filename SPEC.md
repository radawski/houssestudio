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
  diario/semanal/mensual — quedan para Fase 3.
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
- Ventas sueltas usan el catálogo de servicios existente como sugerencia de
  nombre/precio, con monto final editable.
- Un turno cancelado que ya tenía cobro registrado no borra el pago: queda
  como dato histórico para el reporte de caja.

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
- `recordWalkInSale(input)` en un `lib/actions/sales.ts` nuevo: inserta en
  `walk_in_sales`. El formulario sugiere nombre/precio desde el catálogo de
  servicios activos, pero el monto final es editable.
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
