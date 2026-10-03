import "server-only";

import { createHash, createHmac, timingSafeEqual } from "node:crypto";

import { siteUrl } from "@/lib/config";

/**
 * Tokens de autogestion del cliente.
 *
 * El turno no requiere que el cliente se registre, asi que el link que recibe es
 * su unica credencial. Por eso en la base se guarda solo el hash: quien lea la
 * tabla `appointments` no puede reconstruir los links ni cancelar turnos ajenos.
 *
 * El token se deriva del id del turno con un HMAC y un secreto del servidor
 * (`MANAGE_TOKEN_SECRET`), en vez de salir al azar: asi cualquier email
 * posterior a la reserva (turno confirmado, recordatorio) puede volver a armar
 * el link sin guardar el token en ningun lado. Sin el secreto no se puede
 * calcular el token de ningun turno, y la busqueda sigue siendo por hash
 * exacto, asi que tampoco hay forma de enumerar turnos.
 *
 * Los turnos reservados antes de este cambio tienen un token al azar: su link
 * de la reserva sigue andando, pero `deriveManageToken` no lo reproduce (ver
 * `manageTokenMatches`).
 */

/** Prefijo fijo: el mismo secreto no sirve para derivar ninguna otra cosa. */
const PURPOSE = "manage:";

function manageTokenSecret(): string {
  const secret = process.env.MANAGE_TOKEN_SECRET;
  if (!secret) {
    throw new Error(
      "Falta la variable de entorno MANAGE_TOKEN_SECRET. Copiala de .env.local.example a .env.local.",
    );
  }
  return secret;
}

/** Token del link `/turno/[token]` de un turno: 32 bytes en base64url. */
export function deriveManageToken(appointmentId: string, secret = manageTokenSecret()): string {
  return createHmac("sha256", secret).update(PURPOSE + appointmentId).digest("base64url");
}

export function hashManageToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Si el hash guardado de un turno corresponde al token derivado. Falso para
 * los turnos reservados antes de derivar los tokens: para esos no hay link
 * que armar fuera de la reserva.
 */
export function manageTokenMatches(appointmentId: string, storedHash: string): boolean {
  return hashManageToken(deriveManageToken(appointmentId)) === storedHash;
}

/**
 * Link de autogestión para un email posterior a la reserva (turno
 * confirmado, recordatorio), o `null` si no se puede armar: turno anterior a
 * los tokens derivados, o falta `MANAGE_TOKEN_SECRET`. En ese último caso se
 * avisa por consola y el email sale sin botón en vez de fallar.
 */
export function manageUrlFor(id: string, storedHash: string): string | null {
  try {
    return manageTokenMatches(id, storedHash) ? `${siteUrl()}/turno/${deriveManageToken(id)}` : null;
  } catch (error) {
    console.error(`No se pudo armar el link del turno: ${error instanceof Error ? error.message : error}`);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Baja del recordatorio para volver (mail 1d)
// ---------------------------------------------------------------------------

/** Otro propósito que el del turno: un token de turno no da de baja a nadie. */
const UNSUBSCRIBE_PURPOSE = "unsubscribe:";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function unsubscribeSignature(customerId: string, secret: string): string {
  return createHmac("sha256", secret).update(UNSUBSCRIBE_PURPOSE + customerId).digest("base64url");
}

/**
 * Token del link "No quiero recibir recordatorios": `<id del cliente>.<firma>`.
 *
 * A diferencia del token del turno, la página de baja tiene que saber de qué
 * cliente se trata sin buscarlo por hash, así que el id va a la vista. No es
 * secreto (es un uuid sin otro uso público); lo que impide dar de baja a otro
 * es la firma, que no se puede calcular sin `MANAGE_TOKEN_SECRET`.
 */
export function deriveUnsubscribeToken(customerId: string, secret = manageTokenSecret()): string {
  return `${customerId}.${unsubscribeSignature(customerId, secret)}`;
}

/** El cliente del token, o `null` si el token no es válido. */
export function readUnsubscribeToken(token: string, secret = manageTokenSecret()): string | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [customerId, signature] = parts;
  if (!UUID_PATTERN.test(customerId)) return null;

  const given = Buffer.from(signature);
  const expected = Buffer.from(unsubscribeSignature(customerId, secret));
  return given.length === expected.length && timingSafeEqual(given, expected) ? customerId : null;
}

export function unsubscribeUrlFor(customerId: string): string {
  return `${siteUrl()}/baja/${deriveUnsubscribeToken(customerId)}`;
}
