-- =============================================================================
-- HOUSSESTUDIO - Venta de productos
--
-- Una venta suelta ahora puede ser un servicio (un corte sin turno) o un
-- producto (cera, bebida...), que no tiene relacion con el catalogo de
-- servicios. `kind` distingue las dos; las filas existentes quedan como
-- 'servicio' por el default.
--
-- No se puede deducir "producto" de un `service_id` nulo: borrar un servicio
-- tambien lo deja nulo (`on delete set null`), y esa venta sigue siendo de un
-- servicio. Por eso la columna explicita.
--
-- Para un producto, `service_name` guarda el nombre libre que se escribio al
-- venderlo (congelado, igual que el nombre del servicio) y `service_id` va
-- nulo. Se reutiliza la columna en vez de agregar otra para no tener dos
-- nombres posibles por fila.
-- =============================================================================

alter table public.walk_in_sales
  add column if not exists kind text not null default 'servicio';

alter table public.walk_in_sales
  drop constraint if exists walk_in_sales_kind_check;

alter table public.walk_in_sales
  add constraint walk_in_sales_kind_check check (kind in ('servicio', 'producto'));
