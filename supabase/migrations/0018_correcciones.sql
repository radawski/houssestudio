-- =============================================================================
-- 0018 · Correcciones del peluquero (cobros y ventas sueltas)
--
-- El peluquero puede corregir un cobro mal cargado (monto, medio, día),
-- deshacer un cobro y cambiar el medio de pago de una venta suelta. Lo que es
-- una sola sentencia (deshacer "No vino", restaurar un cancelado, anular una
-- venta) va desde el servidor con su guarda en el UPDATE/DELETE; acá quedan
-- solo las escrituras que tienen que ir juntas o que repiten una regla de
-- 0016 que conviene tener en un único lugar.
--
-- Solo AGREGA tres funciones. No cambia ni borra nada de lo que ya existe.
-- `0015` queda reservada para V2 `no_show_at`.
-- Es idempotente: se puede correr más de una vez.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- update_appointment_payment
--
-- Reemplaza monto, medio y fecha del cobro de un turno completado. Con
-- `p_cash` en null es un cobro de un solo método (`p_method`); con `p_cash`
-- es dividido: esa parte en efectivo, el resto por transferencia, y `method`
-- guarda el del monto mayor (misma regla que
-- `complete_appointment_with_split_payment`, 0016).
-- -----------------------------------------------------------------------------
create or replace function public.update_appointment_payment(
  p_appointment_id uuid,
  p_amount numeric,
  p_method payment_method,
  p_cash numeric,
  p_paid_at timestamptz
)
returns void
language plpgsql
security invoker
as $$
begin
  if p_amount is null or p_amount < 0 then
    raise exception 'Monto invalido.';
  end if;
  if p_cash is not null and (p_cash < 0 or p_cash > p_amount) then
    raise exception 'El efectivo no puede superar el total.';
  end if;
  -- Un minuto de margen: el servidor manda "ahora" con su propio reloj, que
  -- puede ir apenas adelantado respecto del de la base.
  if p_paid_at is null or p_paid_at > now() + interval '1 minute' then
    raise exception 'La fecha del cobro no puede ser futura.';
  end if;

  update public.payments p
     set amount = p_amount,
         method = case
                    when p_cash is null then p_method
                    when p_cash >= p_amount - p_cash then 'efectivo'::payment_method
                    else 'transferencia'::payment_method
                  end,
         cash_amount = p_cash,
         transfer_amount = case when p_cash is null then null else p_amount - p_cash end,
         paid_at = least(p_paid_at, now())
    from public.appointments a
   where p.appointment_id = p_appointment_id
     and a.id = p.appointment_id
     and a.status = 'completado';

  if not found then
    raise exception 'El turno ya no tiene un cobro para corregir.';
  end if;
end;
$$;

revoke all on function public.update_appointment_payment(uuid, numeric, payment_method, numeric, timestamptz) from public, anon;
grant execute on function public.update_appointment_payment(uuid, numeric, payment_method, numeric, timestamptz) to authenticated;

-- -----------------------------------------------------------------------------
-- undo_appointment_payment
--
-- Borra el cobro y devuelve el turno a `confirmado`, en una sola transacción
-- (mismo motivo que 0007: son dos escrituras que no pueden quedar a medias).
-- Volver a `confirmado` lo hace entrar de nuevo en `appointments_no_overlap`:
-- si el horario ya lo ocupa otro turno, la base lanza 23P01 y no se borra
-- nada.
-- -----------------------------------------------------------------------------
create or replace function public.undo_appointment_payment(p_appointment_id uuid)
returns void
language plpgsql
security invoker
as $$
begin
  update public.appointments
     set status = 'confirmado', completed_at = null
   where id = p_appointment_id
     and status = 'completado';

  if not found then
    raise exception 'El turno ya no tiene un cobro para deshacer.';
  end if;

  delete from public.payments where appointment_id = p_appointment_id;
end;
$$;

revoke all on function public.undo_appointment_payment(uuid) from public, anon;
grant execute on function public.undo_appointment_payment(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- update_walk_in_sale_payment
--
-- Cambia el medio de pago de una venta suelta entera. Con `p_cash` en null
-- todas sus filas pasan a `p_method`; con `p_cash`, el efectivo se reparte
-- entre las filas en proporción a su monto, con el mismo algoritmo que
-- `record_walk_in_sale_split` (0016), así cada fila suma exacto.
-- -----------------------------------------------------------------------------
create or replace function public.update_walk_in_sale_payment(
  p_sale_id uuid,
  p_method payment_method,
  p_cash numeric
)
returns void
language plpgsql
security invoker
as $$
declare
  v_total numeric;
  v_cash_left numeric;
  v_rest numeric;
  v_row record;
  v_cash numeric;
begin
  select sum(amount) into v_total from public.walk_in_sales where sale_id = p_sale_id;

  if v_total is null then
    raise exception 'La venta ya no existe.';
  end if;

  if p_cash is null then
    update public.walk_in_sales
       set method = p_method, cash_amount = null, transfer_amount = null
     where sale_id = p_sale_id;
    return;
  end if;

  if p_cash < 0 or p_cash > v_total then
    raise exception 'El monto en efectivo no puede superar el total de la venta.';
  end if;

  v_cash_left := p_cash;
  v_rest := v_total;
  for v_row in
    select id, amount from public.walk_in_sales where sale_id = p_sale_id order by amount, id
  loop
    v_rest := v_rest - v_row.amount;
    v_cash := greatest(
      least(case when v_total = 0 then 0 else round(v_row.amount * p_cash / v_total, 2) end,
            v_row.amount, v_cash_left),
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
end;
$$;

revoke all on function public.update_walk_in_sale_payment(uuid, payment_method, numeric) from public, anon;
grant execute on function public.update_walk_in_sale_payment(uuid, payment_method, numeric) to authenticated;

-- -----------------------------------------------------------------------------
-- replace_walk_in_sale
--
-- "Anular y volver a cargar": borra la venta `p_sale_id` y registra la nueva
-- en la misma transacción, así nunca queda la venta vieja borrada sin la
-- nueva (ni las dos). Con `p_cash` en null la nueva es de un solo método;
-- con `p_cash`, dividida. La nueva conserva el `sold_at` de la anterior, así
-- corregir la venta de ayer no la pasa a la caja de hoy. Devuelve el
-- `sale_id` nuevo.
-- -----------------------------------------------------------------------------
create or replace function public.replace_walk_in_sale(
  p_sale_id uuid,
  p_items jsonb,
  p_method payment_method,
  p_cash numeric,
  p_note text
)
returns uuid
language plpgsql
security invoker
as $$
declare
  v_sold_at timestamptz;
  v_new uuid;
begin
  select min(sold_at) into v_sold_at from public.walk_in_sales where sale_id = p_sale_id;
  if v_sold_at is null then
    raise exception 'La venta ya no existe.';
  end if;

  delete from public.walk_in_sales where sale_id = p_sale_id;

  if p_cash is null then
    v_new := public.record_walk_in_sale(p_items, p_method, p_note);
  else
    v_new := public.record_walk_in_sale_split(p_items, p_cash, p_note);
  end if;

  update public.walk_in_sales set sold_at = v_sold_at where sale_id = v_new;
  return v_new;
end;
$$;

revoke all on function public.replace_walk_in_sale(uuid, jsonb, payment_method, numeric, text) from public, anon;
grant execute on function public.replace_walk_in_sale(uuid, jsonb, payment_method, numeric, text) to authenticated;
