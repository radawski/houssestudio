-- =============================================================================
-- HOUSSESTUDIO - Productos, categorias y ventas con varios items
--
-- Hasta aca un producto se vendia con un nombre libre (0008) y cada venta
-- suelta era una sola fila con un solo concepto. Desde esta migracion:
--
-- * `product_categories` y `products`: el catalogo de lo que se vende en caja
--   ademas de los servicios (ceras, bebidas, alfajores...). Los servicios no
--   llevan categoria: en la Caja y en la venta se agrupan todos en "Cortes".
-- * `walk_in_sales` pasa a ser UNA FILA POR ITEM vendido. Los items de una
--   misma venta (un carrito) comparten `sale_id`; `quantity` y `unit_price`
--   guardan cuantas unidades y a que precio, y `amount` sigue siendo el
--   subtotal del item, asi los totales de Caja no cambian de formula.
-- * `record_walk_in_sale`: registra una venta entera en una transaccion,
--   tomando nombre y precio del catalogo en el servidor (solo catalogo: el
--   precio no llega del navegador).
--
-- Solo aditiva. Las ventas existentes quedan como ventas de un item
-- (`sale_id` = su propio id, cantidad 1, precio unitario = monto). Las de
-- producto con nombre libre no tienen categoria: la Caja las agrupa en "Otros".
-- =============================================================================

-- -----------------------------------------------------------------------------
-- product_categories
-- -----------------------------------------------------------------------------
create table if not exists public.product_categories (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (length(btrim(name)) > 0),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- Sin dos categorias con el mismo nombre (sin importar mayusculas).
create unique index if not exists product_categories_name_key
  on public.product_categories (lower(btrim(name)));

-- -----------------------------------------------------------------------------
-- products
--
-- Borrar una categoria que todavia tiene productos se impide (`restrict`): la
-- interfaz pide vaciarla antes, asi ningun producto queda sin categoria.
-- -----------------------------------------------------------------------------
create table if not exists public.products (
  id          uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.product_categories (id) on delete restrict,
  name        text not null check (length(btrim(name)) > 0),
  price       numeric(10, 2) not null check (price >= 0),
  is_active   boolean not null default true,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

create unique index if not exists products_category_name_key
  on public.products (category_id, lower(btrim(name)));

create index if not exists products_category_idx on public.products (category_id, sort_order);

-- -----------------------------------------------------------------------------
-- RLS: la 0002 crea las policies de admin recorriendo una lista fija de
-- tablas, asi que estas no las reciben solas.
-- -----------------------------------------------------------------------------
alter table public.product_categories enable row level security;
alter table public.products enable row level security;

drop policy if exists product_categories_admin_all on public.product_categories;
create policy product_categories_admin_all on public.product_categories
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists products_admin_all on public.products;
create policy products_admin_all on public.products
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- -----------------------------------------------------------------------------
-- walk_in_sales: una fila por item
-- -----------------------------------------------------------------------------
alter table public.walk_in_sales
  add column if not exists sale_id     uuid,
  add column if not exists product_id  uuid references public.products (id) on delete set null,
  add column if not exists category_id uuid references public.product_categories (id) on delete set null,
  add column if not exists quantity    integer not null default 1,
  add column if not exists unit_price  numeric(10, 2);

-- Las ventas existentes son ventas de un solo item.
update public.walk_in_sales set sale_id = id where sale_id is null;
update public.walk_in_sales set unit_price = amount where unit_price is null;

alter table public.walk_in_sales
  alter column sale_id set default gen_random_uuid(),
  alter column sale_id set not null,
  alter column unit_price set not null;

do $$ begin
  alter table public.walk_in_sales
    add constraint walk_in_sales_quantity_positive check (quantity >= 1);
exception when duplicate_object then null; end $$;

-- El monto es siempre el subtotal del item.
do $$ begin
  alter table public.walk_in_sales
    add constraint walk_in_sales_amount_is_subtotal check (amount = quantity * unit_price);
exception when duplicate_object then null; end $$;

-- Un servicio no lleva producto ni categoria.
do $$ begin
  alter table public.walk_in_sales
    add constraint walk_in_sales_service_has_no_product
    check (kind = 'producto' or (product_id is null and category_id is null));
exception when duplicate_object then null; end $$;

create index if not exists walk_in_sales_sale_idx on public.walk_in_sales (sale_id);

-- -----------------------------------------------------------------------------
-- record_walk_in_sale
--
-- `p_items`: [{ "kind": "servicio" | "producto", "id": "<uuid>", "quantity": 2 }]
-- Nombre, precio y categoria salen del catalogo en el servidor. Si un item ya
-- no existe (o el producto esta desactivado) falla la venta entera: no queda
-- una venta a medias. Devuelve el `sale_id`.
--
-- `security invoker`, igual que las otras funciones: corre con los permisos
-- de quien la llama y sigue exigiendo las policies de admin.
-- -----------------------------------------------------------------------------
create or replace function public.record_walk_in_sale(
  p_items jsonb,
  p_method payment_method,
  p_note text
)
returns uuid
language plpgsql
security invoker
as $$
declare
  v_sale uuid := gen_random_uuid();
  v_item jsonb;
  v_quantity integer;
begin
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'La venta no tiene items.';
  end if;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_quantity := (v_item ->> 'quantity')::integer;
    if v_quantity is null or v_quantity < 1 then
      raise exception 'Cantidad invalida.';
    end if;

    if v_item ->> 'kind' = 'servicio' then
      insert into public.walk_in_sales
        (sale_id, kind, service_id, service_name, quantity, unit_price, amount, method, note)
      select v_sale, 'servicio', s.id, s.name, v_quantity, s.price, s.price * v_quantity, p_method, p_note
        from public.services s
       where s.id = (v_item ->> 'id')::uuid;
    elsif v_item ->> 'kind' = 'producto' then
      insert into public.walk_in_sales
        (sale_id, kind, product_id, category_id, service_name, quantity, unit_price, amount, method, note)
      select v_sale, 'producto', p.id, p.category_id, p.name, v_quantity, p.price, p.price * v_quantity, p_method, p_note
        from public.products p
       where p.id = (v_item ->> 'id')::uuid
         and p.is_active;
    else
      raise exception 'Tipo de item invalido.';
    end if;

    if not found then
      raise exception 'Un item de la venta ya no esta disponible.';
    end if;
  end loop;

  return v_sale;
end;
$$;

revoke all on function public.record_walk_in_sale(jsonb, payment_method, text) from public, anon;
grant execute on function public.record_walk_in_sale(jsonb, payment_method, text) to authenticated;
