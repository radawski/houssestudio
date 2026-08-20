/**
 * Constantes transversales del negocio.
 *
 * La zona horaria vive aca y no en cada llamada: toda la aritmetica de agenda
 * (horarios comerciales, bloqueos, slots) se hace en hora local del local,
 * mientras que la base guarda siempre `timestamptz` en UTC.
 */
export const BUSINESS_TIMEZONE = "America/Argentina/Buenos_Aires";

export const CURRENCY = "ARS";
export const LOCALE = "es-AR";

/** Nombre comercial usado en titulos, emails y la interfaz publica. */
export const BUSINESS_NAME = "HOUSSESTUDIO";

/**
 * Anticipacion minima con la que un cliente puede reservar. Evita que alguien
 * tome un turno que arranca en cinco minutos y el barbero no llegue a verlo.
 */
export const MIN_BOOKING_LEAD_MINUTES = 60;

/** Cuantos dias hacia adelante se puede reservar desde el portal publico. */
export const BOOKING_HORIZON_DAYS = 60;

/**
 * Hasta cuantas horas antes del turno el cliente puede cancelar o pedir
 * reprogramacion por su cuenta. Configurable por fila en `settings`; este es el
 * valor de arranque.
 */
export const DEFAULT_CANCELLATION_WINDOW_HOURS = 2;

export const siteUrl = () =>
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
