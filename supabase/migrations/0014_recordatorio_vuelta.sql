-- =============================================================================
-- HOUSSESTUDIO - Recordatorio para volver (requiere 0013)
--
-- * `customers.comeback_opt_out_at`: cuando el cliente tocó "No quiero
--   recibir recordatorios" en el mail 1d. Solo corta ese mail; el
--   recordatorio del dia anterior es sobre un turno que el cliente pidio y
--   sigue llegando (decision del usuario).
-- * `email_log_comeback_once_idx`: un solo 1d `enviado` por turno. El turno es
--   el ultimo completado del cliente, asi que "un recordatorio por ciclo" sale
--   solo: si el cliente vuelve y se completa otro turno, el id cambia. Es la
--   misma llave de idempotencia que `email_log_reminder_once_idx` (0001).
--
-- Solo aditiva. Correrla dos veces no falla.
-- =============================================================================

alter table public.customers
  add column if not exists comeback_opt_out_at timestamptz;

create unique index if not exists email_log_comeback_once_idx
  on public.email_log (appointment_id, type)
  where type = 'vuelta' and status = 'enviado';
