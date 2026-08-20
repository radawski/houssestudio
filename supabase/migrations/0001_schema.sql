-- =============================================================================
-- HOUSSESTUDIO - Esquema inicial
--
-- Aplicar desde el SQL Editor de Supabase, en orden numerico.
-- =============================================================================

-- btree_gist habilita la restriccion de exclusion que impide turnos solapados.
create extension if not exists btree_gist;

-- -----------------------------------------------------------------------------
-- Tipos
-- -----------------------------------------------------------------------------
do $$ begin
  create type appointment_status as enum
    ('pendiente', 'confirmado', 'completado', 'cancelado', 'no_show');
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_method as enum ('efectivo', 'transferencia');
exception when duplicate_object then null; end $$;

do $$ begin
  create type email_type as enum ('confirmacion', 'cancelacion', 'recordatorio');
exception when duplicate_object then null; end $$;

do $$ begin
  create type email_status as enum ('enviado', 'error');
exception when duplicate_object then null; end $$;

-- -----------------------------------------------------------------------------
-- Utilidades
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- admins
--
-- Quien puede entrar al panel. El negocio es unipersonal, asi que en la practica
-- tiene una sola fila; existe como tabla para no cablear un email en el codigo.
-- -----------------------------------------------------------------------------
create table if not exists public.admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- services
-- -----------------------------------------------------------------------------
create table if not exists public.services (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  description      text,
  price            numeric(10, 2) not null check (price >= 0),
  duration_minutes integer not null check (duration_minutes > 0 and duration_minutes <= 480),
  is_active        boolean not null default true,
  sort_order       integer not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists services_active_idx
  on public.services (is_active, sort_order);

drop trigger if exists services_set_updated_at on public.services;
create trigger services_set_updated_at
  before update on public.services
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- business_hours
--
-- Horario comercial recurrente, una fila por dia de la semana (0 = domingo).
-- Las horas se guardan como `time` local del local; la conversion a instantes
-- concretos la hace el motor de disponibilidad usando la zona del negocio.
-- -----------------------------------------------------------------------------
create table if not exists public.business_hours (
  weekday    smallint primary key check (weekday between 0 and 6),
  is_closed  boolean not null default false,
  opens_at   time not null default '09:00',
  closes_at  time not null default '19:00',
  updated_at timestamptz not null default now(),
  constraint business_hours_valid_range check (closes_at > opens_at)
);

drop trigger if exists business_hours_set_updated_at on public.business_hours;
create trigger business_hours_set_updated_at
  before update on public.business_hours
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- time_blocks
--
-- Excepciones puntuales: almuerzos, tramites, feriados, imprevistos.
-- -----------------------------------------------------------------------------
create table if not exists public.time_blocks (
  id         uuid primary key default gen_random_uuid(),
  starts_at  timestamptz not null,
  ends_at    timestamptz not null,
  reason     text,
  created_at timestamptz not null default now(),
  constraint time_blocks_valid_range check (ends_at > starts_at)
);

create index if not exists time_blocks_range_idx
  on public.time_blocks using gist (tstzrange(starts_at, ends_at));

-- -----------------------------------------------------------------------------
-- customers
--
-- Se crea o actualiza sola al reservar. El telefono normalizado (solo digitos)
-- es la identidad del cliente: es el dato que siempre dan y no cambia.
-- -----------------------------------------------------------------------------
create table if not exists public.customers (
  id         uuid primary key default gen_random_uuid(),
  full_name  text not null,
  phone      text not null unique,
  email      text,
  notes      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists customers_email_idx on public.customers (lower(email));
create index if not exists customers_name_idx on public.customers (lower(full_name));

drop trigger if exists customers_set_updated_at on public.customers;
create trigger customers_set_updated_at
  before update on public.customers
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- appointments
--
-- Notas de diseno:
--
--  * `*_at_booking` congela nombre, precio y duracion del servicio en el momento
--    de reservar. Sin esto, cambiar un precio hoy reescribiria la facturacion
--    historica de los reportes.
--  * `manage_token_hash` guarda solo el sha256 del token de autogestion. El token
--    en claro viaja unicamente en el link que recibe el cliente, de modo que
--    filtrar la tabla no permite cancelar turnos ajenos.
--  * La restriccion de exclusion es la unica garantia real contra dos reservas
--    simultaneas sobre el mismo horario: la validacion en el front no alcanza.
--    Solo aplica a los estados que ocupan la agenda, asi que cancelar o marcar
--    no-show libera el slot automaticamente.
-- -----------------------------------------------------------------------------
create table if not exists public.appointments (
  id                         uuid primary key default gen_random_uuid(),
  customer_id                uuid not null references public.customers (id) on delete restrict,
  service_id                 uuid references public.services (id) on delete set null,
  service_name_at_booking    text not null,
  price_at_booking           numeric(10, 2) not null check (price_at_booking >= 0),
  duration_minutes_at_booking integer not null check (duration_minutes_at_booking > 0),
  starts_at                  timestamptz not null,
  ends_at                    timestamptz not null,
  status                     appointment_status not null default 'pendiente',
  manage_token_hash          text not null unique,
  customer_note              text,
  cancellation_reason        text,
  cancelled_by               text check (cancelled_by in ('cliente', 'barbero')),
  confirmed_at               timestamptz,
  completed_at               timestamptz,
  cancelled_at               timestamptz,
  created_at                 timestamptz not null default now(),
  updated_at                 timestamptz not null default now(),
  constraint appointments_valid_range check (ends_at > starts_at),
  constraint appointments_no_overlap
    exclude using gist (tstzrange(starts_at, ends_at) with &&)
    where (status in ('pendiente', 'confirmado'))
);

create index if not exists appointments_starts_at_idx on public.appointments (starts_at);
create index if not exists appointments_status_idx on public.appointments (status, starts_at);
create index if not exists appointments_customer_idx on public.appointments (customer_id, starts_at desc);

drop trigger if exists appointments_set_updated_at on public.appointments;
create trigger appointments_set_updated_at
  before update on public.appointments
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- payments
--
-- Un cobro por turno completado. `amount` puede diferir de `price_at_booking`
-- (descuentos, redondeos), por eso se guarda aparte y no se deriva.
-- -----------------------------------------------------------------------------
create table if not exists public.payments (
  id             uuid primary key default gen_random_uuid(),
  appointment_id uuid not null unique references public.appointments (id) on delete cascade,
  amount         numeric(10, 2) not null check (amount >= 0),
  method         payment_method not null,
  paid_at        timestamptz not null default now(),
  created_at     timestamptz not null default now()
);

create index if not exists payments_paid_at_idx on public.payments (paid_at);

-- -----------------------------------------------------------------------------
-- email_log
--
-- Registro de envios. Ademas de auditoria, el indice unico parcial actua como
-- llave de idempotencia: garantiza un unico recordatorio enviado por turno,
-- aunque el cron corra varias veces dentro de la misma ventana.
-- -----------------------------------------------------------------------------
create table if not exists public.email_log (
  id             uuid primary key default gen_random_uuid(),
  appointment_id uuid references public.appointments (id) on delete cascade,
  type           email_type not null,
  to_email       text not null,
  status         email_status not null default 'enviado',
  provider_id    text,
  error          text,
  sent_at        timestamptz not null default now()
);

create unique index if not exists email_log_reminder_once_idx
  on public.email_log (appointment_id, type)
  where type = 'recordatorio' and status = 'enviado';

create index if not exists email_log_appointment_idx on public.email_log (appointment_id);

-- -----------------------------------------------------------------------------
-- settings
--
-- Fila unica (el check sobre la PK impide una segunda).
-- -----------------------------------------------------------------------------
create table if not exists public.settings (
  id                        boolean primary key default true check (id),
  business_name             text not null default 'HOUSSESTUDIO',
  address                   text,
  phone                     text,
  cancellation_window_hours integer not null default 2 check (cancellation_window_hours >= 0),
  reminder_hours_before     integer not null default 24 check (reminder_hours_before > 0),
  min_booking_lead_minutes  integer not null default 60 check (min_booking_lead_minutes >= 0),
  updated_at                timestamptz not null default now()
);

insert into public.settings (id) values (true) on conflict (id) do nothing;

drop trigger if exists settings_set_updated_at on public.settings;
create trigger settings_set_updated_at
  before update on public.settings
  for each row execute function public.set_updated_at();
