-- =============================================================================
-- HOUSSESTUDIO - Ventana de reserva configurable
--
-- Hasta acá el límite de anticipación era una constante en el código
-- (`BOOKING_HORIZON_DAYS = 60`) y, peor, vivía solo en el navegador: ni el
-- motor de disponibilidad ni `createBooking` lo conocían, así que un pedido
-- armado a mano podía tomar un turno para dentro de dos años.
--
-- Pasa a ser configurable desde el panel, y la regla se aplica del lado del
-- servidor.
-- =============================================================================

alter table public.settings
  add column if not exists max_booking_days integer not null default 60;

do $$ begin
  alter table public.settings
    add constraint settings_max_booking_days_range
    check (max_booking_days between 1 and 365);
exception when duplicate_object then null; end $$;

-- El techo evita el otro extremo: una anticipación mínima desmedida deja la
-- agenda sin ningún horario reservable y se lee como si la app estuviera rota.
do $$ begin
  alter table public.settings
    add constraint settings_min_lead_range
    check (min_booking_lead_minutes between 0 and 10080);
exception when duplicate_object then null; end $$;

-- Valor elegido por el dueño del local. El `default 60` de arriba es el
-- comportamiento histórico, para que una instalación nueva no cambie de
-- conducta solo por aplicar esta migración.
update public.settings set max_booking_days = 7 where id = true;
