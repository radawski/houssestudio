/**
 * Normaliza un DNI a solo digitos, con el mismo criterio que `normalizePhone`
 * y por el mismo motivo: "30.123.456", "30 123 456" y "30123456" tienen que
 * resolver a la misma ficha, o cada forma de escribirlo crearia un cliente
 * nuevo y partiria el historial.
 *
 * Vive fuera de `lib/validation/schemas.ts` porque la usa el portal publico
 * (`dni-gate.tsx`): importarla desde los schemas le mandaba zod entero al
 * navegador por una sola linea.
 */
export function normalizeDni(input: string): string {
  return input.replace(/\D/g, "");
}
