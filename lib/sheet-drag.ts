/**
 * Reglas del gesto de cerrar una hoja inferior deslizándola hacia abajo.
 *
 * Viven aparte del componente para poder probarlas sin un navegador.
 */

/** Recorrido mínimo hacia abajo antes de que el gesto "agarre" la hoja. */
export const DRAG_START_PX = 8;

/** Bajando más que esto, se cierra al soltar. */
const DISMISS_DISTANCE_PX = 120;

/** O un cuarto de la altura de la hoja, si la hoja es más baja que eso. */
const DISMISS_FRACTION = 0.25;

/** Un movimiento rápido hacia abajo (px/ms) también cierra, aunque sea corto. */
const DISMISS_VELOCITY = 0.6;

/** El tirón rápido tiene que recorrer al menos esto, para no cerrar por un roce. */
const FLICK_MIN_PX = 40;

/** ¿El gesto empieza a arrastrar la hoja? Solo hacia abajo y más vertical que horizontal. */
export function startsDrag(dx: number, dy: number): boolean {
  return dy > DRAG_START_PX && Math.abs(dy) > Math.abs(dx);
}

/** ¿Al soltar, la hoja se cierra o vuelve a su lugar? */
export function shouldDismiss({
  distance,
  velocity,
  sheetHeight,
}: {
  distance: number;
  velocity: number;
  sheetHeight: number;
}): boolean {
  const threshold = Math.min(DISMISS_DISTANCE_PX, sheetHeight * DISMISS_FRACTION);
  if (distance >= threshold) return true;
  return velocity >= DISMISS_VELOCITY && distance >= FLICK_MIN_PX;
}

/** Cuánto se aclara el fondo oscuro mientras la hoja baja: 1 arriba, 0 al salir. */
export function overlayOpacity(distance: number, sheetHeight: number): number {
  if (sheetHeight <= 0) return 1;
  return Math.max(0, Math.min(1, 1 - distance / sheetHeight));
}
