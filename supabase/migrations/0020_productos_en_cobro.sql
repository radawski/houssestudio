-- =============================================================================
-- 0020 · Productos en el cobro de un turno
--
-- Caso: el cliente que vino con turno compra una bebida durante la atención.
-- Antes había que cobrar el turno y después cargar la bebida como venta
-- suelta. Ahora "Cobrar turno" puede sumar productos y cobrar todo junto.
--
-- Modelo: el turno sigue cobrándose en `payments` (una fila, como siempre) y
-- los productos se guardan como una venta suelta normal (`walk_in_sales`,
-- mismo `sale_id`), con la nueva columna `appointment_id` que la vincula al
-- turno. Así la Caja por categoría y las estadísticas siguen leyendo los
-- productos igual que antes.
--
-- Solo AGREGA: una columna opcional y dos funciones nuevas, y vuelve a crear
-- `undo_appointment_payment` y `replace_walk_in_sale` con la MISMA firma (para
-- que no aparezca una sobrecarga) y el comportamiento extendido:
--   · deshacer el cobro de un turno también borra sus productos;
--   · "anular y volver a cargar" una venta conserva su vínculo al turno.
-- `0015` sigue reservada para V2 `no_show_at`.
-- Es idempotente: se puede correr más de una vez.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Columna
--
-- `on delete cascade`, igual que `payments.appointment_id` (0001): si se
-- borra el turno, se va con su cobro y sus productos.
-- -----------------------------------------------------------------------------
alter table public.walk_in_sales
  add column if not exists appointment_id uuid references public.appointments (id) on delete cascade;

create index if not exists walk_in_sales_appointment_idx
  on public.walk_in_sales (appointment_id)
  where appointment_id is not null;

-- -----------------------------------------------------------------------------
-- complete_appointment_with_products
--
-- Cobra el turno (monto `p_amount`) y registra los productos `p_items`
-- ([{ "kind": "producto", "id": "<uuid>", "quantity": 2 }]) en una sola
-- transacción, vinculados al turno.
--
-- Con `p_cash` en null todo va por `p_method`. Con `p_cash` es un pago
-- dividido del TOTAL (turno + productos): el efectivo se reparte entre el
-- cobro del turno y la venta en proporción a cada monto, con el mismo
-- recorte que `record_walk_in_sale_split` (0016), así cada parte suma exacto.
--
-- Precio y nombre de los productos salen del catálogo en el servidor. Devuelve
-- el `sale_id` de los productos.
-- -----------------------------------------------------------------------------
create or replace function public.complete_appointment_with_products(
  p_appointment_id uuid,
  p_amount numeric,
  p_method payment_method,
  p_cash numeric,
  p_items jsonb
)
returns uuid
language plpgsql
security invoker
as $$
declare
  v_products numeric;
  v_found integer;
  v_total numeric;
  v_turno_cash numeric;
  v_sale uuid;
begin
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'El cobro no tiene productos.';
  end if;
  if exists (select 1 from jsonb_array_elements(p_items) i where i ->> 'kind' is distinct from 'producto') then
    raise exception 'Al cobro de un turno solo se le suman productos.';
  end if;
  if p_amount is null or p_amount < 0 then
    raise exception 'Monto invalido.';
  end if;

  -- Total de los productos según el catálogo (no lo que mostró el navegador).
  select coalesce(sum(p.price * (i ->> 'quantity')::integer), 0), count(p.id)
    into v_products, v_found
    from jsonb_array_elements(p_items) i
    left join public.products p on p.id = (i ->> 'id')::uuid and p.is_active;

  if v_found <> jsonb_array_length(p_items) then
    raise exception 'Un item de la venta ya no esta disponible.';
  end if;

  if p_cash is null then
    perform public.complete_appointment_with_payment(p_appointment_id, p_amount, p_method);
    v_sale := public.record_walk_in_sale(p_items, p_method, null);
  else
    v_total := p_amount + v_products;
    if p_cash < 0 or p_cash > v_total then
      raise exception 'El monto en efectivo no puede superar el total de la venta.';
    end if;

    v_turno_cash := greatest(
      least(case when v_total = 0 then 0 else round(p_amount * p_cash / v_total, 2) end, p_amount, p_cash),
      p_cash - v_products
    );

    perform public.complete_appointment_with_split_payment(p_appointment_id, v_turno_cash, p_amount - v_turno_cash);
    v_sale := public.record_walk_in_sale_split(p_items, p_cash - v_turno_cash, null);
  end if;

  update public.walk_in_sales set appointment_id = p_appointment_id where sale_id = v_sale;
  return v_sale;
end;
$$;

revoke all on function public.complete_appointment_with_products(uuid, numeric, payment_method, numeric, jsonb) from public, anon;
grant execute on function public.complete_appointment_with_products(uuid, numeric, payment_method, numeric, jsonb) to authenticated;

-- -----------------------------------------------------------------------------
-- update_appointment_checkout
--
-- "Corregir cobro" de un turno, contando sus productos. `p_amount` es solo el
-- monto del turno; el medio de pago y el día valen para todo lo que se cobró
-- junto. Con `p_cash`, es el efectivo del TOTAL (turno + productos) y se
-- reparte igual que al cobrar.
--
-- Sin productos vinculados hace exactamente lo mismo que
-- `update_appointment_payment` (0018).
-- -----------------------------------------------------------------------------
create or replace function public.update_appointment_checkout(
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
declare
  v_products numeric;
  v_total numeric;
  v_turno_cash numeric;
  v_cash_left numeric;
  v_rest numeric;
  v_sale record;
  v_sale_cash numeric;
begin
  if not exists (select 1 from public.walk_in_sales where appointment_id = p_appointment_id) then
    perform public.update_appointment_payment(p_appointment_id, p_amount, p_method, p_cash, p_paid_at);
    return;
  end if;

  if p_amount is null or p_amount < 0 then
    raise exception 'Monto invalido.';
  end if;

  select sum(amount) into v_products
    from public.walk_in_sales where appointment_id = p_appointment_id;

  if p_cash is null then
    perform public.update_appointment_payment(p_appointment_id, p_amount, p_method, null, p_paid_at);
    for v_sale in
      select distinct sale_id from public.walk_in_sales where appointment_id = p_appointment_id
    loop
      perform public.update_walk_in_sale_payment(v_sale.sale_id, p_method, null);
    end loop;
  else
    v_total := p_amount + v_products;
    if p_cash < 0 or p_cash > v_total then
      raise exception 'El efectivo no puede superar el total.';
    end if;

    v_turno_cash := greatest(
      least(case when v_total = 0 then 0 else round(p_amount * p_cash / v_total, 2) end, p_amount, p_cash),
      p_cash - v_products
    );
    perform public.update_appointment_payment(p_appointment_id, p_amount, p_method, v_turno_cash, p_paid_at);

    -- Normalmente hay una sola venta vinculada; si hubiera más, el efectivo
    -- restante se reparte entre ellas con el mismo recorte.
    v_cash_left := p_cash - v_turno_cash;
    v_rest := v_products;
    for v_sale in
      select sale_id, sum(amount) as amount
        from public.walk_in_sales
       where appointment_id = p_appointment_id
       group by sale_id
       order by sum(amount), sale_id
    loop
      v_rest := v_rest - v_sale.amount;
      v_sale_cash := greatest(
        least(case when v_products = 0 then 0 else round(v_sale.amount * (p_cash - v_turno_cash) / v_products, 2) end,
              v_sale.amount, v_cash_left),
        v_cash_left - v_rest
      );
      v_cash_left := v_cash_left - v_sale_cash;
      perform public.update_walk_in_sale_payment(v_sale.sale_id, p_method, v_sale_cash);
    end loop;
  end if;

  -- Los productos entran en Caja el mismo día que el turno.
  update public.walk_in_sales w
     set sold_at = p.paid_at
    from public.payments p
   where p.appointment_id = p_appointment_id
     and w.appointment_id = p_appointment_id;
end;
$$;

revoke all on function public.update_appointment_checkout(uuid, numeric, payment_method, numeric, timestamptz) from public, anon;
grant execute on function public.update_appointment_checkout(uuid, numeric, payment_method, numeric, timestamptz) to authenticated;

-- -----------------------------------------------------------------------------
-- undo_appointment_payment (misma firma que 0018)
--
-- Además del cobro, borra los productos que se cobraron junto con el turno:
-- si el turno se vuelve a cobrar, se vuelven a cargar.
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
  delete from public.walk_in_sales where appointment_id = p_appointment_id;
end;
$$;

revoke all on function public.undo_appointment_payment(uuid) from public, anon;
grant execute on function public.undo_appointment_payment(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- replace_walk_in_sale (misma firma que 0018)
--
-- Igual que antes, y además la venta nueva conserva el `appointment_id` de la
-- anterior, así corregir la bebida de un turno desde Caja no la desvincula.
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
  v_appointment uuid;
  v_new uuid;
begin
  select min(sold_at), (array_agg(appointment_id) filter (where appointment_id is not null))[1]
    into v_sold_at, v_appointment
    from public.walk_in_sales where sale_id = p_sale_id;
  if v_sold_at is null then
    raise exception 'La venta ya no existe.';
  end if;

  delete from public.walk_in_sales where sale_id = p_sale_id;

  if p_cash is null then
    v_new := public.record_walk_in_sale(p_items, p_method, p_note);
  else
    v_new := public.record_walk_in_sale_split(p_items, p_cash, p_note);
  end if;

  update public.walk_in_sales
     set sold_at = v_sold_at, appointment_id = v_appointment
   where sale_id = v_new;
  return v_new;
end;
$$;

revoke all on function public.replace_walk_in_sale(uuid, jsonb, payment_method, numeric, text) from public, anon;
grant execute on function public.replace_walk_in_sale(uuid, jsonb, payment_method, numeric, text) to authenticated;
