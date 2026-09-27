/**
 * Mensaje de error para mostrarle al barbero después de una acción fallida.
 *
 * Dos casos no sirven tal cual y se reemplazan por `fallback` (que nombra la
 * acción, ej. "No se pudo aceptar el turno.") más la causa probable:
 * - errores de red (sin conexión, el servidor no respondió): el navegador los
 *   da en inglés y distinto en cada motor ("Failed to fetch", "Load failed");
 * - errores lanzados desde una Server Action en producción: Next reemplaza el
 *   mensaje real por uno genérico en inglés para no filtrar detalles.
 *
 * Cualquier otro mensaje (los que armamos en español en el servidor) se
 * muestra tal cual, porque ya dice qué pasó.
 */
const UNHELPFUL = [
  /failed to fetch/i,
  /load failed/i,
  /networkerror/i,
  /network request failed/i,
  /server components render/i,
  /an error occurred/i,
  /unexpected response/i,
];

export function friendlyErrorMessage(error: unknown, fallback: string): string {
  const message = error instanceof Error ? error.message.trim() : "";
  if (!message || UNHELPFUL.some((pattern) => pattern.test(message))) {
    return `${fallback} Revisá la conexión.`;
  }
  return message;
}
