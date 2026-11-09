-- =============================================================================
-- 0016 · Pago dividido (efectivo + transferencia)
--
-- Un cobro (de un turno o de una venta suelta) puede pagarse con los dos
-- métodos a la vez. Solo AGREGA: dos columnas opcionales y dos funciones
-- nuevas. No cambia ni borra nada de lo que ya existe, así que los cobros y
-- ventas anteriores siguen leyéndose igual y el código publicado antes de
-- esta migración sigue funcionando.
--
-- Modelo: `cash_amount` y `transfer_amount` quedan en null para un cobro de
-- un solo método (como todos los de antes). En uno dividido llevan cuánto fue
-- en cada método y la base exige que sumen `amount`. `method` sigue siendo
-- obligatorio: en un cobro dividido guarda el método del monto mayor, solo
-- para que lo lea bien el código viejo; para sumar por método manda el par de
-- columnas.
--
-- Es idempotente: se puede correr más de una vez.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Columnas
-- -----------------------------------------------------------------------------
alter table public.payments
  add column if not exists cash_amount numeric(10, 2),
  add column if not exists transfer_amount numeric(10, 2);

alter table public.walk_in_sales
  add column if not exists cash_amount numeric(10, 2),
  add column if not exists transfer_amount numeric(10, 2);

-- Las dos van juntas, no negativas, y suman el total.
do $$ begin
  alter table public.payments
    add constraint payments_split_adds_up check (
      (cash_amount is null and transfer_amount is null)
      or (cash_amount >= 0 and transfer_amount >= 0 and cash_amount + transfer_amount = amount)
    );
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.walk_in_sales
    add constraint walk_in_sales_split_adds_up check (
      (cash_amount is null and transfer_amount is null)
      or (cash_amount >= 0 and transfer_amount >= 0 and cash_amount + transfer_amount = amount)
    );
exception when duplicate_object then null; end $$;

-- -----------------------------------------------------------------------------
-- complete_appointment_with_split_payment
--
-- Igual que `complete_appointment_with_payment` (0007), pero con el monto en
-- efectivo y el monto en transferencia. Las dos escrituras van en una sola
-- transacción. `security invoker`: sigue exigiendo las policies de admin.
-- -----------------------------------------------------------------------------
create or replace function public.complete_appointment_with_split_payment(
  p_appointment_id uuid,
  p_cash numeric,
  p_transfer numeric
)
returns void
language plpgsql
security invoker
as $$
begin
  if p_cash is null or p_transfer is null or p_cash < 0 or p_transfer < 0 then
    raise exception 'Montos invalidos.';
  end if;

  update public.appointments
     set status = 'completado', completed_at = now()
   where id = p_appointment_id
     and status = 'confirmado';

  if not found then
    raise exception 'El turno ya no esta en un estado que se pueda cobrar.';
  end if;

  insert into public.payments (appointment_id, amount, method, cash_amount, transfer_amount)
  values (
    p_appointment_id,
    p_cash + p_transfer,
    case when p_cash >= p_transfer then 'efectivo'::payment_method else 'transferencia'::payment_method end,
    p_cash,
    p_transfer
  );
end;
$$;

revoke all on function public.complete_appointment_with_split_payment(uuid, numeric, numeric) from public, anon;
grant execute on function public.complete_appointment_with_split_payment(uuid, numeric, numeric) to authenticated;

-- -----------------------------------------------------------------------------
-- record_walk_in_sale_split
--
-- Igual que `record_walk_in_sale` (0012), pero el cliente pagó `p_cash` en
-- efectivo y el resto por transferencia. El efectivo se reparte entre los
-- ítems en proporción a su monto (el último ítem se lleva el redondeo), así
-- cada fila suma exacto y la Caja por categoría sigue cerrando.
-- -----------------------------------------------------------------------------
create or replace function public.record_walk_in_sale_split(
  p_items jsonb,
  p_cash numeric,
  p_note text
)
returns uuid
language plpgsql
security invoker
as $$
declare
  v_sale uuid;
  v_total numeric;
  v_cash_left numeric;
  v_rest numeric;
  v_row record;
  v_cash numeric;
begin
  -- Primero se registra como siempre (valida ítems, precios y catálogo)...
  v_sale := public.record_walk_in_sale(p_items, 'efectivo', p_note);

  select sum(amount) into v_total from public.walk_in_sales where sale_id = v_sale;

  if p_cash is null or p_cash < 0 or p_cash > v_total then
    raise exception 'El monto en efectivo no puede superar el total de la venta.';
  end if;

  -- ...y después se reparte el efectivo entre sus filas, en proporción. Cada
  -- fila toma al menos lo que las siguientes ya no pueden absorber
  -- (`v_rest`), así ninguna recibe más efectivo que su propio monto y la
  -- última se lleva justo lo que falta.
  v_cash_left := p_cash;
  v_rest := v_total;
  for v_row in
    select id, amount from public.walk_in_sales where sale_id = v_sale order by amount, id
  loop
    v_rest := v_rest - v_row.amount;
    v_cash := greatest(
      least(round(v_row.amount * p_cash / v_total, 2), v_row.amount, v_cash_left),
      v_cash_left - v_rest
    );
    v_cash_left := v_cash_left - v_cash;

    update public.walk_in_sales
       set cash_amount = v_cash,
           transfer_amount = v_row.amount - v_cash,
           method = case when v_cash >= v_row.amount - v_cash
                         then 'efectivo'::payment_method else 'transferencia'::payment_method end
     where id = v_row.id;
  end loop;

  return v_sale;
end;
$$;

revoke all on function public.record_walk_in_sale_split(jsonb, numeric, text) from public, anon;
grant execute on function public.record_walk_in_sale_split(jsonb, numeric, text) to authenticated;
