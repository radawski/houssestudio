-- =============================================================================
-- HOUSSESTUDIO - Horario partido
--
-- Hasta aca cada dia de la semana tenia un unico rango (`opens_at`/`closes_at`),
-- horario corrido. Se suma un segundo tramo opcional para cubrir el caso de un
-- corte por almuerzo (ej. 7:00 a 12:00 y 15:00 a 20:00) sin tener que cargarlo
-- a mano todos los dias como bloqueo.
--
-- Ambas columnas nulas (el default) es exactamente el comportamiento actual:
-- ningun dia existente cambia de conducta al aplicar esta migracion.
-- =============================================================================

alter table public.business_hours
  add column if not exists opens_at_2 time,
  add column if not exists closes_at_2 time;

-- Van de a par: no tiene sentido un cierre sin apertura o viceversa.
do $$ begin
  alter table public.business_hours
    add constraint business_hours_second_range_paired
    check ((opens_at_2 is null) = (closes_at_2 is null));
exception when duplicate_object then null; end $$;

-- El segundo tramo tiene que ser un rango valido en si mismo...
do $$ begin
  alter table public.business_hours
    add constraint business_hours_second_range_valid
    check (opens_at_2 is null or closes_at_2 > opens_at_2);
exception when duplicate_object then null; end $$;

-- ...y tiene que empezar despues de que cierra el primero: sin esto se podrian
-- cargar dos tramos solapados o invertidos y la grilla ofrecida quedaria
-- rota (o duplicada) sin que la base lo hubiera evitado.
do $$ begin
  alter table public.business_hours
    add constraint business_hours_second_range_after_first
    check (opens_at_2 is null or opens_at_2 > closes_at);
exception when duplicate_object then null; end $$;
