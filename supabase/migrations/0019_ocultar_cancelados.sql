-- =============================================================================
-- 0019 · Quitar de la Agenda un turno cancelado
--
-- La Agenda del día muestra los cancelados (tachados, con su motivo). El
-- peluquero puede quitar uno para que la vista quede más limpia: es solo
-- visual. El turno no se borra y sigue en la ficha del cliente, su historial
-- y las estadísticas. Restaurarlo lo vuelve a mostrar.
--
-- Solo AGREGA una columna opcional. No cambia nada de lo existente: los
-- turnos actuales quedan con `hidden_from_agenda_at` en null (visibles).
-- Es idempotente: se puede correr más de una vez.
-- =============================================================================

alter table public.appointments
  add column if not exists hidden_from_agenda_at timestamptz;

comment on column public.appointments.hidden_from_agenda_at is
  'Cuándo el peluquero quitó este turno cancelado de la Agenda. Solo visual.';
