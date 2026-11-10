import { businessTimeToDate } from "@/lib/availability";
import { businessDateKey, formatInTz } from "@/lib/format";
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

/**
 * A qué estado vuelve un turno cancelado al restaurarlo, o `null` si no se
 * puede. Solo los que canceló el peluquero: una cancelación del cliente es
 * una decisión del cliente, y no se deshace desde el panel. Vuelve como
 * confirmado si ya lo estaba antes de cancelarse; si no, era una solicitud
 * rechazada y vuelve a Solicitudes.
 */
export function restoreTarget(params: {
  status: AppointmentStatus;
  cancelledBy: string | null;
  confirmedAt: string | null;
}): "confirmado" | "pendiente" | null {
  if (params.status !== "cancelado" || params.cancelledBy !== "barbero") return null;
  return params.confirmedAt ? "confirmado" : "pendiente";
}

/**
 * Instante del cobro corregido: el día elegido (`yyyy-MM-dd`, hora local) con
 * la hora del cobro original. Si el día no cambió, queda el instante original
 * tal cual; si la combinación cae en el futuro (se pasa a hoy un cobro que se
 * cargó más tarde que ahora), se usa `now`. Devuelve `null` si el día elegido
 * es posterior a hoy.
 */
export function correctedPaidAt(params: {
  originalPaidAt: string;
  paidOn: string;
  now?: Date;
}): Date | null {
  const now = params.now ?? new Date();
  if (params.paidOn > businessDateKey(now)) return null;
  if (params.paidOn === businessDateKey(params.originalPaidAt)) return new Date(params.originalPaidAt);
  const candidate = businessTimeToDate(params.paidOn, formatInTz(params.originalPaidAt, "HH:mm"));
  return candidate.getTime() > now.getTime() ? now : candidate;
}
