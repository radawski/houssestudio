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

const CANCELABLE_STATUSES: AppointmentStatus[] = ["pendiente", "confirmado"];

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
