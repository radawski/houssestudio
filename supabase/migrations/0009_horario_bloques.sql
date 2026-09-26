-- =============================================================================
-- HOUSSESTUDIO - Horario con N bloques por dia
--
-- Hasta aca cada dia tenia uno o dos tramos fijos en columnas
-- (`opens_at`/`closes_at` y el opcional `opens_at_2`/`closes_at_2` de la 0006).
-- Pasa a una lista de bloques sin limite: una fila por bloque en
-- `business_hour_ranges`.
--
-- Migracion solo aditiva (expand/contract): crea la tabla, copia los tramos
-- actuales y suma la funcion de guardado. Las columnas viejas de
-- `business_hours` quedan sin uso y se retiran en una migracion posterior, una
-- vez verificado el cambio. `business_hours` sigue siendo la fila por dia con
-- `is_closed`.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- business_hour_ranges
--
-- Sin columna de orden: los bloques de un dia no se pisan, asi que su orden
-- queda determinado por `opens_at`. Un dia cerrado conserva sus bloques, para
-- que reabrirlo devuelva el horario que tenia.
-- -----------------------------------------------------------------------------
create table if not exists public.business_hour_ranges (
  id         uuid primary key default gen_random_uuid(),
  weekday    smallint not null references public.business_hours (weekday) on delete cascade,
  opens_at   time not null,
  closes_at  time not null,
  created_at timestamptz not null default now(),
  constraint business_hour_ranges_valid_range check (closes_at > opens_at),
  -- Dos bloques del mismo dia no pueden solaparse. El rango se arma sobre una
  -- fecha fija porque `time` no tiene tipo de rango propio; la expresion es
  -- inmutable, asi que la acepta la restriccion. `[)` deja que un bloque
  -- arranque justo cuando cierra otro.
  constraint business_hour_ranges_no_overlap exclude using gist (
    weekday with =,
    tsrange(date '2000-01-01' + opens_at, date '2000-01-01' + closes_at) with &&
  )
);

create index if not exists business_hour_ranges_weekday_idx
  on public.business_hour_ranges (weekday, opens_at);

alter table public.business_hour_ranges enable row level security;

-- La 0002 crea las policies de admin recorriendo una lista fija de tablas, asi
-- que esta no la recibe sola.
drop policy if exists business_hour_ranges_admin_all on public.business_hour_ranges;
create policy business_hour_ranges_admin_all on public.business_hour_ranges
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- -----------------------------------------------------------------------------
-- Copia de los tramos actuales
--
-- Solo si la tabla esta vacia, para que correr la migracion dos veces no
-- duplique bloques.
-- -----------------------------------------------------------------------------
insert into public.business_hour_ranges (weekday, opens_at, closes_at)
select weekday, opens_at, closes_at
  from public.business_hours
 where not exists (select 1 from public.business_hour_ranges)
union all
select weekday, opens_at_2, closes_at_2
  from public.business_hours
 where opens_at_2 is not null
   and closes_at_2 is not null
   and not exists (select 1 from public.business_hour_ranges);

-- -----------------------------------------------------------------------------
-- save_business_hours
--
-- Reemplaza el horario de uno o varios dias en una sola transaccion: el estado
-- abierto/cerrado de cada dia y su lista completa de bloques. Recibe una lista
-- de dias y no los siete fijos, para que el guardado por dia de la Fase G use
-- la misma funcion.
--
-- Formato de `p_days`:
--   [{ "weekday": 1, "is_closed": false,
--      "ranges": [{ "opens_at": "09:00", "closes_at": "13:00" }, ...] }, ...]
--
-- `security invoker`, igual que `complete_appointment_with_payment`: corre con
-- los permisos de quien la llama y sigue exigiendo las policies de admin.
-- -----------------------------------------------------------------------------
create or replace function public.save_business_hours(p_days jsonb)
returns void
language plpgsql
security invoker
as $$
declare
  v_day jsonb;
  v_weekday smallint;
begin
  for v_day in select * from jsonb_array_elements(p_days) loop
    v_weekday := (v_day ->> 'weekday')::smallint;

    update public.business_hours
       set is_closed = (v_day ->> 'is_closed')::boolean,
           updated_at = now()
     where weekday = v_weekday;

    if not found then
      raise exception 'No existe el dia % en el horario semanal.', v_weekday;
    end if;

    delete from public.business_hour_ranges where weekday = v_weekday;

    insert into public.business_hour_ranges (weekday, opens_at, closes_at)
    select v_weekday, (r ->> 'opens_at')::time, (r ->> 'closes_at')::time
      from jsonb_array_elements(coalesce(v_day -> 'ranges', '[]'::jsonb)) as r;
  end loop;
end;
$$;

revoke all on function public.save_business_hours(jsonb) from public, anon;
grant execute on function public.save_business_hours(jsonb) to authenticated;
