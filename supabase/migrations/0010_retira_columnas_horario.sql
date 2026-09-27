-- =============================================================================
-- HOUSSESTUDIO - Retira las columnas viejas de horario
--
-- Segunda mitad del expand/contract de la 0009: desde esa migracion los
-- bloques de cada dia viven en `business_hour_ranges`, y ninguna version
-- publicada del codigo lee ya `opens_at`/`closes_at` (0001) ni
-- `opens_at_2`/`closes_at_2` (0006). `business_hours` queda como la fila por
-- dia con `is_closed`.
--
-- Las restricciones se retiran a mano antes que las columnas para que quede
-- explicito que se van; `if exists` permite correr el archivo dos veces.
-- =============================================================================

alter table public.business_hours
  drop constraint if exists business_hours_valid_range,
  drop constraint if exists business_hours_second_range_paired,
  drop constraint if exists business_hours_second_range_valid,
  drop constraint if exists business_hours_second_range_after_first;

alter table public.business_hours
  drop column if exists opens_at,
  drop column if exists closes_at,
  drop column if exists opens_at_2,
  drop column if exists closes_at_2;
