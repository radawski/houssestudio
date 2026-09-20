import type { AppointmentStatus } from "@/lib/supabase/database.types";

/**
 * Presentacion de los estados de un turno.
 *
 * Vive en un solo lugar para que la agenda, la bandeja de solicitudes y la
 * pantalla de autogestion del cliente hablen exactamente el mismo idioma
 * visual: un mismo color siempre significa lo mismo.
 */
export const STATUS_META: Record<
  AppointmentStatus,
  { label: string; badge: string; dot: string; event: string }
> = {
  pendiente: {
    label: "Pendiente",
    badge: "bg-amber-100 text-amber-900 border-amber-200",
    dot: "bg-amber-700",
    event: "border-amber-300 bg-amber-50 text-amber-950",
  },
  confirmado: {
    label: "Confirmado",
    badge: "bg-emerald-100 text-emerald-900 border-emerald-200",
    dot: "bg-emerald-600",
    event: "border-emerald-300 bg-emerald-50 text-emerald-950",
  },
  completado: {
    label: "Completado",
    badge: "bg-sky-100 text-sky-900 border-sky-200",
    dot: "bg-sky-600",
    event: "border-sky-300 bg-sky-50 text-sky-950",
  },
  cancelado: {
    label: "Cancelado",
    badge: "bg-neutral-100 text-neutral-600 border-neutral-200",
    dot: "bg-neutral-400",
    event: "border-neutral-300 bg-neutral-50 text-neutral-500 line-through",
  },
  no_show: {
    label: "No asistió",
    badge: "bg-rose-100 text-rose-900 border-rose-200",
    dot: "bg-rose-600",
    event: "border-rose-300 bg-rose-50 text-rose-950",
  },
};

export const ALL_STATUSES = Object.keys(STATUS_META) as AppointmentStatus[];
