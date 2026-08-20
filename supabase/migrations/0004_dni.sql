-- =============================================================================
-- HOUSSESTUDIO - DNI como identidad del cliente
--
-- El telefono deja de ser la llave: dos personas de una misma familia pueden
-- compartirlo, y obligaba al cliente recurrente a reescribir sus datos en cada
-- visita. El DNI es unico por persona y permite reconocer al cliente con un
-- solo campo.
--
-- Los datos existentes (clientes y turnos de prueba, cargados antes de existir
-- el DNI) se borran: no hay forma de inferir el documento de alguien que nunca
-- lo cargo, y el volumen es de prueba, no produccion real.
-- =============================================================================

-- Los turnos primero: customer_id en appointments es "on delete restrict",
-- asi que no se puede borrar un cliente con turnos sin borrar antes sus turnos.
-- payments y email_log caen solos por "on delete cascade" desde appointments.
delete from public.appointments;
delete from public.customers;

-- La tabla queda vacia tras el borrado de arriba, asi que "not null" se puede
-- agregar directo, sin el paso intermedio de rellenar con un default.
alter table public.customers
  add column dni text not null,
  add constraint customers_dni_format check (dni ~ '^[0-9]{7,8}$'),
  add constraint customers_dni_unique unique (dni);

-- El telefono ya no identifica al cliente, pero se conserva como columna de
-- contacto y de busqueda para el panel del barbero.
alter table public.customers drop constraint if exists customers_phone_key;
create index if not exists customers_phone_idx on public.customers (phone);
