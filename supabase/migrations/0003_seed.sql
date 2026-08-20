-- =============================================================================
-- HOUSSESTUDIO - Datos iniciales
--
-- Valores de arranque para poder operar apenas se aplica el esquema. Todo esto
-- es editable despues desde el panel de administracion.
-- =============================================================================

-- Servicios del catalogo publico.
insert into public.services (name, description, price, duration_minutes, sort_order)
select * from (values
  ('Corte de pelo',         'Corte completo con lavado y peinado.',       12000.00, 45, 1),
  ('Corte de pelo + barba', 'Corte completo mas perfilado de barba.',     18000.00, 60, 2)
) as v(name, description, price, duration_minutes, sort_order)
where not exists (select 1 from public.services);

-- Horario comercial recurrente. 0 = domingo.
-- Arranque: domingo y lunes cerrado, martes a viernes 9 a 19, sabado 9 a 17.
insert into public.business_hours (weekday, is_closed, opens_at, closes_at) values
  (0, true,  '09:00', '19:00'),
  (1, true,  '09:00', '19:00'),
  (2, false, '09:00', '19:00'),
  (3, false, '09:00', '19:00'),
  (4, false, '09:00', '19:00'),
  (5, false, '09:00', '19:00'),
  (6, false, '09:00', '17:00')
on conflict (weekday) do nothing;
