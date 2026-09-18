import type { AppointmentStatus } from "@/lib/supabase/database.types";

/**
 * Reglas temporales sobre turnos, mismo patrón que `lib/cancellation.ts`:
 * funciones puras, sin `server-only`, para poder testear los bordes sin
 * tocar la base.
 */

export function canMarkNoShow(params: {
  status: AppointmentStatus;
  startsAt: string | Date;
  now?: Date;
}): boolean {
  if (params.status !== "confirmado") return false;
  const start = typeof params.startsAt === "string" ? new Date(params.startsAt) : params.startsAt;
  const now = params.now ?? new Date();
  return now.getTime() >= start.getTime();
}
