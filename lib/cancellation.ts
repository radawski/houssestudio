import type { AppointmentStatus } from "@/lib/supabase/database.types";

/**
 * Ventana de cancelación por cuenta propia del cliente.
 *
 * Función pura, sin `server-only` ni Supabase, para poder testear los bordes
 * (justo antes/en/después del límite) sin tocar la base — mismo criterio que
 * `lib/availability.ts`. El borde es estricto (`<`) a propósito: el `UPDATE`
 * que hace cumplir esto en `cancelByToken` usa `>` sobre el mismo cálculo, y
 * los dos tienen que coincidir en el segundo límite o UI y base discrepan.
 */

export const CANCELABLE_STATUSES: AppointmentStatus[] = ["pendiente", "confirmado"];

export function cancellationDeadline(startsAt: string | Date, windowHours: number): Date {
  const start = typeof startsAt === "string" ? new Date(startsAt) : startsAt;
  return new Date(start.getTime() - windowHours * 60 * 60 * 1000);
}

export function canCancel(params: {
  status: AppointmentStatus;
  startsAt: string | Date;
  windowHours: number;
  now?: Date;
}): boolean {
  if (!CANCELABLE_STATUSES.includes(params.status)) return false;
  const now = params.now ?? new Date();
  return now.getTime() < cancellationDeadline(params.startsAt, params.windowHours).getTime();
}

/**
 * Qué mostrarle al cliente en `/turno/[token]`, resuelto en un solo lugar
 * testeable en vez de quedar como dos booleans combinados a mano en la
 * página. El bug que motivó esto (`page.tsx` ocultaba todo el bloque de
 * cancelación cuando el plazo ya había vencido, sin ofrecer ni el botón ni
 * la salida a WhatsApp) era exactamente la clase de error que un test sobre
 * esta función atrapa y uno sobre `canCancel` no.
 */
export type CancelAffordance = "boton" | "coordinar" | "ninguna";

export function cancelAffordance(params: {
  status: AppointmentStatus;
  startsAt: string | Date;
  windowHours: number;
  now?: Date;
}): CancelAffordance {
  if (!CANCELABLE_STATUSES.includes(params.status)) return "ninguna";
  return canCancel(params) ? "boton" : "coordinar";
}
