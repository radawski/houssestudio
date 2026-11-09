import { checkPhone, normalizePhone } from "@/lib/phone";

/**
 * Lógica pura de "Mis turnos": el cliente se identifica con DNI + teléfono y
 * ve sus turnos sin necesidad del link del mail.
 */

/**
 * ¿El teléfono que escribió el cliente es el de su ficha?
 *
 * Se comparan los diez dígitos nacionales, así da igual cómo lo escriba: con o
 * sin 0, con o sin 15, con +54 9. Un número que no se puede interpretar nunca
 * coincide, aunque la ficha tuviera ese mismo texto mal cargado.
 */
export function phonesMatch(input: string, registeredPhone: string): boolean {
  const typed = checkPhone(input);
  if (typed.kind === "invalid") return false;
  return typed.national === normalizePhone(registeredPhone);
}

/** Primer nombre para el saludo ("Hola, Matías"). */
export function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? "";
}

/** Cuántos turnos pasados se muestran: alcanza para ver el último corte. */
export const PAST_LIMIT = 5;

/**
 * Separa los turnos en próximos (el más cercano primero) y anteriores (el más
 * reciente primero, hasta `PAST_LIMIT`).
 *
 * Un turno sigue siendo "próximo" mientras no terminó: el que está en curso
 * todavía es el que el cliente quiere ver arriba.
 */
export function splitMyAppointments<T extends { starts_at: string; ends_at: string }>(
  appointments: T[],
  now: Date = new Date(),
): { upcoming: T[]; past: T[] } {
  const byStart = (a: T, b: T) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime();
  const upcoming = appointments.filter((a) => new Date(a.ends_at) > now).sort(byStart);
  const past = appointments
    .filter((a) => new Date(a.ends_at) <= now)
    .sort((a, b) => byStart(b, a))
    .slice(0, PAST_LIMIT);
  return { upcoming, past };
}
