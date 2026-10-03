/**
 * Volver a Más (diseño "Estados de carga", n-MasVolver*).
 *
 * El ← de Servicios, Productos y Disponibilidad era un link hacia adelante:
 * Más se volvía a pedir y la tarjeta de sesión pasaba por su esqueleto. Si la
 * entrada anterior del historial es Más, `router.back()` la trae de la caché
 * del router, sin carga.
 *
 * El historial no se puede leer, así que el panel anota cada navegación
 * (`NavigationTracker`): cuál fue la página anterior y si a la actual se llegó
 * con "atrás". Solo si se llegó hacia adelante desde Más, la entrada anterior
 * es seguro Más. Cualquier otro caso navega como siempre.
 *
 * Al llegar, Más marca un momento la fila de la que se vuelve, para que el
 * pulgar sepa dónde estaba.
 */

const MAS_URL = "/admin/mas";

export type NavTrack = {
  /** URL actual (ruta + búsqueda). */
  current: string | null;
  /** URL desde la que se llegó a la actual. */
  previous: string | null;
  /** A la actual se llegó con "atrás"/"adelante" del historial. */
  viaPop: boolean;
};

export function trackNavigation(track: NavTrack, url: string, viaPop: boolean): NavTrack {
  if (url === track.current) return track;
  return { current: url, previous: track.current, viaPop };
}

export function canGoBackToMas(track: NavTrack): boolean {
  return track.previous === MAS_URL && !track.viaPop;
}

/** Sección desde la que se vuelve a Más (la fila a marcar) y cuándo. */
export const MAS_RETURN_KEY = "hs-mas-return";

/** Cuánto queda marcada la fila de la que se vuelve. */
export const MAS_RETURN_HIGHLIGHT_MS = 600;

/**
 * Un aviso de vuelta solo vale recién hecho: si se salió de Más antes de que
 * la marca se apagara, la próxima visita no tiene que marcar nada.
 */
export function isFreshReturn(at: number, now: number): boolean {
  return now - at < 2_000;
}

/** `sessionStorage` puede no estar (navegación privada estricta): nunca rompe. */
export function writeSession(key: string, value: string | null) {
  try {
    if (value === null) sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, value);
  } catch {
    // Sin almacenamiento no se marca la fila; la vuelta funciona igual.
  }
}

export function readSession(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}
