# Plan — Fase 3: recordatorio automático por email

Alcance (decisión del usuario): **solo el recordatorio**. CRM y reportes
quedan "a futuro".

## Qué ya existe

- El **diseño del mail**: `buildReminderEmail` (E5), "Mañana te esperamos",
  con el layout de "¡Te esperamos!", la nota con el plazo de cancelación
  configurado y el botón "Ver mi turno".
- El **link del turno** se puede rearmar con el token derivado (E4,
  `manageUrlFor`). Los turnos anteriores a ese cambio salen sin botón.
- **Sin duplicados**: `email_log` tiene un índice único que admite un solo
  recordatorio `enviado` por turno (`email_log_reminder_once_idx`, 0001).
- `CRON_SECRET` está reservado en `.env.local.example`, todavía vacío.

## Cómo funciona

- **Una tarea diaria en Vercel** (Vercel Cron) llama a `/api/cron/reminders`
  una vez por día. En el plan Hobby solo se permite una ejecución diaria, y
  Vercel la corre en algún momento dentro de la hora elegida (±59 min). Con
  Vercel Pro se puede afinar.
- La ruta solo responde si llega con el secreto (`Authorization: Bearer
  CRON_SECRET`, que Vercel agrega solo). Sin él responde 401.
- Busca los turnos **confirmados** de **mañana** (día local de Buenos Aires),
  con email del cliente, que todavía no tengan recordatorio enviado.
- Por cada uno: arma el mail con el plazo de cancelación vigente y el link
  derivado, lo manda y lo registra en `email_log` como `recordatorio`. Si el
  envío falla, queda registrado con el error. Un fallo no frena los demás.
- Responde un resumen (cuántos enviados, cuántos fallaron, cuántos se
  saltearon), visible en los logs de Vercel.

## Casos borde

- **Pendientes**: no reciben recordatorio (todavía no están confirmados).
- **Confirmados después del envío del día** para el día siguiente: no
  reciben recordatorio; ya recibieron "¡Te esperamos!" minutos antes.
- **Cancelados**: no se buscan.
- **Sin email**: se saltean.
- **Correr dos veces el mismo día** (un reintento manual): el índice único
  impide un segundo recordatorio al mismo turno.

## Tareas

### R1 — Selección y envío (puro + datos)
- `lib/reminders.ts` (puro, con tests): rango de "mañana" en la zona del
  local a partir de un instante; filtro de candidatos.
- `lib/email/send.ts`: `sendReminder` (como `sendAppointmentConfirmed`, tipo
  `recordatorio`).
- `lib/data/reminders.ts`: turnos confirmados de mañana con cliente y si ya
  tienen recordatorio.

### R2 — La ruta y la tarea programada
- `app/api/cron/reminders/route.ts` (GET, 401 sin secreto).
- `vercel.json` con el cron diario (sin dependencias nuevas).
- `CRON_SECRET`: generado en `.env.local`; **el usuario lo carga en Vercel**.

### R3 — Verificación
- Local: llamar la ruta con el secreto y un turno de prueba confirmado para
  mañana → llega el mail; una segunda llamada no lo repite; sin secreto → 401.
- Producción: confirmar en los logs de Vercel la primera ejecución.

## Decisión a confirmar

- **Hora de envío** del recordatorio (hora de Buenos Aires).
