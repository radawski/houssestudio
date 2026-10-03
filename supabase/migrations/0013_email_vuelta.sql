-- =============================================================================
-- HOUSSESTUDIO - Tipo de email para el recordatorio para volver
--
-- El mail "Ya pasó un mes" (1d, tasks/plan-mejoras-octubre.md, Fase 4) se
-- registra en `email_log` con su propio valor, `vuelta`, igual que se hizo con
-- `aceptacion` en 0011.
--
-- Va sola en esta migracion a proposito: Postgres no deja usar un valor de
-- enum recien agregado en la misma transaccion, y el indice que lo usa vive
-- en 0014. `add value if not exists`: correrla dos veces no falla.
-- =============================================================================

alter type public.email_type add value if not exists 'vuelta';
