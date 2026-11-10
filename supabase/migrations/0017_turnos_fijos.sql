-- =============================================================================
-- 0017 · Turnos fijos (plan de noviembre, T2)
--
-- Un cliente con turno fijo (ej.: todos los miércoles 17:00, o el 2° martes
-- de cada mes) tiene una regla en `recurring_appointments`. A partir de ella
-- la app mantiene siempre agendadas las próximas 4 fechas como turnos
-- normales (confirmados), marcados con `appointments.recurring_id`. Si una
-- fecha está ocupada, bloqueada o fuera de horario, se saltea y queda en
-- `recurring_skips` para avisarle al peluquero.
--
-- Solo AGREGA: dos tablas, una columna opcional y un índice. No cambia nada
-- de lo existente; los turnos actuales quedan con `recurring_id` en null.
-- Es idempotente: se puede correr más de una vez.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- recurring_appointments: la regla
-- -----------------------------------------------------------------------------
create table if not exists public.recurring_appointments (
  id           uuid primary key default gen_random_uuid(),
  customer_id  uuid not null references public.customers (id) on delete cascade,
  -- Si el servicio se borra, la regla queda sin servicio y deja de generar.
  service_id   uuid references public.services (id) on delete set null,
  -- Primera fecha (día local) y hora de inicio (hora local del local).
  anchor_date  date not null,
  start_time   time not null,
  -- Exactamente una de las dos: cada N semanas, o el n-ésimo día de la
  -- semana de cada mes (el día de la semana sale de `anchor_date`).
  every_weeks  smallint check (every_weeks in (1, 2, 3)),
  monthly_nth  smallint check (monthly_nth between 1 and 5),
  active       boolean not null default true,
  created_at   timestamptz not null default now(),
  ended_at     timestamptz,
  constraint recurring_appointments_one_frequency
    check ((every_weeks is null) <> (monthly_nth is null))
);

create index if not exists recurring_appointments_customer_idx
  on public.recurring_appointments (customer_id);

-- -----------------------------------------------------------------------------
-- Turnos generados por una regla
-- -----------------------------------------------------------------------------
alter table public.appointments
  add column if not exists recurring_id uuid
    references public.recurring_appointments (id) on delete set null;

-- Llave de idempotencia: una regla no puede generar dos turnos en el mismo
-- horario, aunque la tarea diaria corra dos veces a la vez.
create unique index if not exists appointments_recurring_once_idx
  on public.appointments (recurring_id, starts_at)
  where recurring_id is not null;

-- -----------------------------------------------------------------------------
-- recurring_skips: fechas que no se pudieron agendar
-- -----------------------------------------------------------------------------
create table if not exists public.recurring_skips (
  id           uuid primary key default gen_random_uuid(),
  recurring_id uuid not null references public.recurring_appointments (id) on delete cascade,
  skipped_on   date not null,
  reason       text not null,
  -- Cuando el peluquero lo resolvió (agendó otro horario o lo descartó).
  resolved_at  timestamptz,
  created_at   timestamptz not null default now(),
  constraint recurring_skips_once unique (recurring_id, skipped_on)
);

-- -----------------------------------------------------------------------------
-- RLS: solo el admin, igual que el resto del panel
-- -----------------------------------------------------------------------------
alter table public.recurring_appointments enable row level security;
alter table public.recurring_skips enable row level security;

drop policy if exists recurring_appointments_admin_all on public.recurring_appointments;
create policy recurring_appointments_admin_all on public.recurring_appointments
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists recurring_skips_admin_all on public.recurring_skips;
create policy recurring_skips_admin_all on public.recurring_skips
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());
