# Plan — Módulo 1: emails-transaccionales (Fase 2)

Fuente: `SPEC.md` sección 4.1. Sin cambios de esquema — `email_log` ya existe.

## Dependencias

```
T1 infraestructura de envío (Resend + env)
   │
   ├─→ T2 confirmación al cliente (hook en createBooking)
   ├─→ T3 aviso interno al barbero (hook en createBooking)
   └─→ T4 notificación de cancelación (hook en cancelAppointment)
```

T2, T3 y T4 dependen todas de T1 pero son independientes entre sí. Se hacen en
ese orden porque T2 y T3 comparten el mismo punto de enganche
(`createBooking`) y conviene tocarlo una sola vez.

## Decisión nueva no cubierta literalmente por SPEC.md

El aviso interno necesita una dirección de destino y no hay ninguna
almacenada hoy (`admins` solo guarda `user_id`, no email). Se agrega
`ADMIN_EMAIL` como variable de entorno nueva — mismo patrón que
`RESEND_API_KEY`. Ya está contemplado en los límites de SPEC.md ("ninguna
dependencia nueva más allá de `resend`"); esto no es una dependencia, es una
env var, pero se marca acá para que quede visible antes de tocar código.

## Tareas

### T1 — Cliente de Resend y variables de entorno

**Archivos**: `lib/email/env.ts`, `lib/email/resend.ts`,
`.env.local.example` (agregar `ADMIN_EMAIL`), `package.json`
(`npm install resend`).

**Alcance**: mismo patrón que `lib/supabase/env.ts` — accessors que lanzan un
error explícito si falta la variable. `lib/email/resend.ts` exporta un
cliente `Resend` singleton, `server-only`.

**Criterios de aceptación**:
- `npm run typecheck` pasa.
- Falta de `RESEND_API_KEY` o `ADMIN_EMAIL` produce un error de arranque
  legible, no un `undefined` silencioso.
- El módulo es `server-only`: importarlo desde un componente cliente rompe el
  build (mismo mecanismo que `lib/supabase/admin.ts`).

**Verificación**: `npm run typecheck && npm run build`.

### T2 — Confirmación al cliente

**Archivos**: `lib/email/send.ts` (`sendBookingConfirmation`),
`lib/actions/booking.ts` (hook en `createBooking`, después del insert
exitoso y antes del `redirect`).

**Alcance**: arma el email con fecha, hora, servicio y el link a
`/turno/[token]`. Si `customer.email` es `null` (caso legado, la columna es
nullable), no intenta enviar — no es un error. Si Resend falla, se atrapa
adentro de `sendBookingConfirmation`, se escribe `email_log` con
`status = 'error'` y la función retorna normalmente: `createBooking` nunca ve
la falla y el `redirect` sigue.

**Criterios de aceptación**:
- Reservar un turno con email manda el mail y crea una fila en `email_log`
  (`type = 'confirmacion'`, `status = 'enviado'`, `provider_id` presente).
- Reservar con un `RESEND_API_KEY` inválido (simulado) igual redirige a
  `/turno/[token]?nuevo=1`, y la fila en `email_log` queda `status = 'error'`
  con el mensaje.
- Un cliente sin email registrado no genera ninguna fila ni error.

**Verificación**: `npm run dev`, reservar un turno real de prueba, revisar la
bandeja del sandbox y la tabla `email_log` en el SQL Editor de Supabase.

### T3 — Aviso interno al barbero

**Archivos**: `lib/email/send.ts` (`sendNewRequestAlert`),
`lib/actions/booking.ts` (mismo hook que T2, mismo evento).

**Alcance**: manda a `ADMIN_EMAIL` los datos de la solicitud nueva (cliente,
servicio, fecha/hora). No escribe en `email_log` — esa tabla registra
comunicación al cliente, no avisos internos, y así no interfiere con el
índice de idempotencia de recordatorios (Fase 3).

**Criterios de aceptación**:
- Cada reserva nueva genera un aviso a `ADMIN_EMAIL` con los datos correctos.
- Un fallo de envío no impide que la reserva se guarde ni afecta a T2 (fallan
  independientemente: si un envío revienta, el otro igual se intenta).

**Verificación**: igual que T2 — reservar y revisar que lleguen los dos
mails.

### T4 — Notificación de cancelación

**Archivos**: `lib/email/send.ts` (`sendCancellationNotice`),
`lib/actions/appointments.ts` (hook en `cancelAppointment`, después del
update exitoso).

**Alcance**: manda a cliente (si tiene email) y a `ADMIN_EMAIL` el aviso de
cancelación con el motivo si lo hay. `cancelAppointment` sigue lanzando error
solo por fallas de la propia base (como hoy); el email nunca es parte de esa
condición de error.

**Criterios de aceptación**:
- Cancelar un turno desde el panel manda la notificación a ambas partes.
- Un fallo de Resend no impide que la cancelación quede guardada ni rompe el
  `toast` de éxito en `CancelAppointmentButton`.
- Queda fila en `email_log` (`type = 'cancelacion'`) solo para el envío al
  cliente.

**Verificación**: cancelar un turno de prueba desde `/admin/solicitudes` o
`/admin/agenda`, revisar bandeja y `email_log`.

## Checkpoints

- Después de T1: `npm run typecheck && npm run build` en verde antes de
  seguir — si el wrapper de Resend no compila, no tiene sentido cablear los
  hooks encima.
- Después de T2+T3: probar una reserva real de punta a punta en el navegador
  antes de tocar `appointments.ts` para T4.
- Al final: `npm run typecheck && npm test && npm run build`, más el repaso
  manual de los tres disparadores (reserva, cancelación admin) en una sola
  pasada.
