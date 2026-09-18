-- =============================================================================
-- HOUSSESTUDIO - Ventas sueltas y cobro atomico de turnos
--
-- `payments` exige `appointment_id not null unique`: un cobro sin turno (un
-- corte que entra sin haber reservado) no encaja ahi. `walk_in_sales` es esa
-- misma idea de cobro, sin la referencia obligatoria a un turno.
--
-- `complete_appointment_with_payment` resuelve el otro problema: cerrar un
-- turno como cobrado son dos escrituras (el UPDATE del estado y el INSERT del
-- pago) que desde supabase-js llegarian como dos llamadas sueltas, con una
-- ventana real entre una y otra. Envueltas en una funcion de Postgres quedan
-- en una sola transaccion: se aplican las dos o ninguna.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- walk_in_sales
-- -----------------------------------------------------------------------------
create table if not exists public.walk_in_sales (
  id           uuid primary key default gen_random_uuid(),
  service_id   uuid references public.services (id) on delete set null,
  service_name text not null,
  amount       numeric(10, 2) not null check (amount >= 0),
  method       payment_method not null,
  sold_at      timestamptz not null default now(),
  note         text,
  created_at   timestamptz not null default now()
);

create index if not exists walk_in_sales_sold_at_idx on public.walk_in_sales (sold_at);

alter table public.walk_in_sales enable row level security;

drop policy if exists walk_in_sales_admin_all on public.walk_in_sales;
create policy walk_in_sales_admin_all on public.walk_in_sales
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- -----------------------------------------------------------------------------
-- complete_appointment_with_payment
--
-- `security invoker` (no `definer`): corre con los permisos de quien la
-- llama, asi que sigue exigiendo las mismas policies `_admin_all` que
-- protegen `appointments` y `payments`. La funcion no reemplaza la
-- autorizacion, solo agrupa las dos escrituras en una transaccion.
-- -----------------------------------------------------------------------------
create or replace function public.complete_appointment_with_payment(
  p_appointment_id uuid,
  p_amount numeric,
  p_method payment_method
)
returns void
language plpgsql
security invoker
as $$
begin
  update public.appointments
     set status = 'completado', completed_at = now()
   where id = p_appointment_id
     and status = 'confirmado';

  if not found then
    raise exception 'El turno ya no esta en un estado que se pueda cobrar.';
  end if;

  insert into public.payments (appointment_id, amount, method)
  values (p_appointment_id, p_amount, p_method);
end;
$$;

revoke all on function public.complete_appointment_with_payment(uuid, numeric, payment_method) from public, anon;
grant execute on function public.complete_appointment_with_payment(uuid, numeric, payment_method) to authenticated;
