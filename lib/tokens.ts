import "server-only";

import { createHash, randomBytes } from "node:crypto";

/**
 * Tokens de autogestion del cliente.
 *
 * El turno no requiere que el cliente se registre, asi que el link que recibe es
 * su unica credencial. Por eso en la base se guarda solo el hash: quien lea la
 * tabla `appointments` no puede reconstruir los links ni cancelar turnos ajenos.
 *
 * 32 bytes al azar hacen que adivinar un token sea inviable, y como la busqueda
 * es por hash exacto no hay forma de enumerar turnos probando prefijos.
 */
export function generateManageToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashManageToken(token) };
}

export function hashManageToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
