-- =============================================================================
-- HOUSSESTUDIO - Tipo de email para el turno confirmado
--
-- `email_type` tenia `confirmacion`, `cancelacion` y `recordatorio`, y
-- `confirmacion` quedo usado desde la Fase 2 para el email de solicitud
-- recibida (1a). El email que avisa que el peluquero acepto el turno (1b) se
-- registra en `email_log` con su propio valor, `aceptacion`, para poder
-- distinguirlos en la auditoria.
--
-- `add value if not exists`: correrla dos veces no falla. El indice de
-- idempotencia de recordatorios no cambia.
-- =============================================================================

alter type public.email_type add value if not exists 'aceptacion';
