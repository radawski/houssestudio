/**
 * Cuentas del retiro de la portada (`components/public/booking-landing.tsx`).
 *
 * La portada se retira una sola vez, cuando el visitante ya la dejó atrás:
 * con el botón "Reservar turno" o bajando con el dedo. Al sacarla del
 * documento todo lo que estaba debajo sube lo que medía, así que el scroll se
 * corrige en la misma cantidad para que nada se mueva en pantalla.
 */

/**
 * Margen para el redondeo de subpíxeles: el desplazamiento suave del botón
 * puede terminar a un par de píxeles del destino exacto.
 */
const SUBPIXEL_TOLERANCE_PX = 2;

/** La portada quedó entera por encima de la pantalla. */
export function heroIsBehind(heroBottom: number): boolean {
  return heroBottom <= SUBPIXEL_TOLERANCE_PX;
}

/** Scroll que deja el contenido donde estaba una vez quitada la portada. */
export function scrollAfterHeroRemoval(scrollY: number, heroHeight: number): number {
  return Math.max(0, scrollY - heroHeight);
}

/**
 * La portada todavía pasa por detrás de un punto fijo a `distanceFromBottom`
 * del borde inferior de la pantalla (el centro del botón de WhatsApp). Sirve
 * para que el botón vaya en blanco sobre el negro y en tinta sobre el papel.
 */
export function heroIsUnder(heroBottom: number, viewportHeight: number, distanceFromBottom: number): boolean {
  return heroBottom > viewportHeight - distanceFromBottom;
}
