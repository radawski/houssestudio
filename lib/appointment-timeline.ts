import type { AppointmentStatus } from "@/lib/supabase/database.types";

/**
 * Historial de un turno para la ficha (design/admin-iphone n-SheetTurno).
 * Función pura, sin `server-only`, para testear los distintos caminos sin
 * tocar la base — mismo patrón que `lib/cancellation.ts`.
 */

export type TimelineStep = {
  label: string;
  /** ISO 8601. */
  at: string;
  author: string;
};

export type TimelineInput = {
  status: AppointmentStatus;
  created_at: string;
  confirmed_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  cancelled_by: "cliente" | "barbero" | null;
  /** Para fechar el cobro por el momento real del pago, no el del cambio de estado. */
  payment: { paid_at: string } | null;
};

export function buildAppointmentTimeline(appointment: TimelineInput): TimelineStep[] {
  const steps: TimelineStep[] = [
    { label: "Reservado", at: appointment.created_at, author: "desde el portal" },
  ];

  if (appointment.confirmed_at) {
    steps.push({ label: "Confirmado", at: appointment.confirmed_at, author: "vos" });
  }

  if (appointment.status === "completado" && appointment.completed_at) {
    steps.push({
      label: "Completado y cobrado",
      at: appointment.payment?.paid_at ?? appointment.completed_at,
      author: "vos",
    });
  } else if (appointment.status === "cancelado" && appointment.cancelled_at) {
    const byClient = appointment.cancelled_by === "cliente";
    steps.push({
      label: byClient ? "Cancelado por el cliente" : "Cancelado",
      at: appointment.cancelled_at,
      author: byClient ? "desde el link del turno" : "vos",
    });
  }
  // `no_show` no tiene timestamp propio en el esquema (a diferencia de
  // confirmed_at/completed_at/cancelled_at): el historial se corta en el
  // último paso con dato real en vez de inventar una fecha. Hueco conocido
  // desde el módulo de registro de cobros, no se resuelve acá.

  return steps;
}
