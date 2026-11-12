/**
 * `fetch` para el cliente de Supabase del panel que reintenta el rechazo
 * "JWT issued at future".
 *
 * Ese 401 lo devuelve la API de datos cuando recibe un token emitido hace
 * instantes y su reloj va apenas atrás del reloj del servicio de sesiones:
 * para ella el token es "del futuro". Pasa justo después de ingresar y cuando
 * la sesión se renueva (una vez por hora), y se arregla solo en un segundo o
 * dos. Sin el reintento, el peluquero veía "No pudimos cargar tu día" recién
 * entrado al panel.
 *
 * Solo se reintenta ese caso: cualquier otra respuesta (incluidos otros 401)
 * vuelve tal cual.
 */

const RETRY_DELAYS_MS = [400, 800, 1600];

const FUTURE_TOKEN_MESSAGE = "JWT issued at future";

async function isFutureTokenRejection(response: Response): Promise<boolean> {
  if (response.status !== 401) return false;
  try {
    return (await response.clone().text()).includes(FUTURE_TOKEN_MESSAGE);
  } catch {
    return false;
  }
}

export function createRetryFetch(
  baseFetch: typeof fetch = fetch,
  wait: (ms: number) => Promise<void> = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
): typeof fetch {
  return async (input, init) => {
    let response = await baseFetch(input, init);
    // Un `Request` ya consumido no se puede volver a enviar; Supabase llama
    // con URL + opciones, que sí.
    if (input instanceof Request) return response;

    for (const delay of RETRY_DELAYS_MS) {
      if (!(await isFutureTokenRejection(response))) break;
      await wait(delay);
      response = await baseFetch(input, init);
    }
    return response;
  };
}
