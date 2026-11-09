/**
 * Clientes del panel: resumen de cada uno y búsqueda. Lógica pura, sin base:
 * las consultas viven en `lib/data/customers.ts`.
 */

import type { AppointmentStatus } from "@/lib/supabase/database.types";

export type CustomerAppointmentLite = {
  status: AppointmentStatus;
  starts_at: string;
  /** Lo cobrado por ese turno (0 si no se cobró). */
  paid?: number;
};

export type CustomerSummary = {
  /** Turnos completados: vino y se cobró. */
  visits: number;
  noShows: number;
  /** Cancelados por el cliente o por el peluquero. */
  cancellations: number;
  /** Total cobrado en sus turnos. */
  spent: number;
  /** Inicio de su última visita completada, o `null`. */
  lastVisitAt: string | null;
  /** Inicio de su próximo turno pendiente o confirmado, o `null`. */
  nextAt: string | null;
};

export function summarizeCustomer(
  appointments: CustomerAppointmentLite[],
  now: Date = new Date(),
): CustomerSummary {
  const summary: CustomerSummary = {
    visits: 0,
    noShows: 0,
    cancellations: 0,
    spent: 0,
    lastVisitAt: null,
    nextAt: null,
  };

  for (const appointment of appointments) {
    const startsAt = new Date(appointment.starts_at);
    summary.spent += appointment.paid ?? 0;

    if (appointment.status === "completado") {
      summary.visits += 1;
      if (!summary.lastVisitAt || startsAt > new Date(summary.lastVisitAt)) {
        summary.lastVisitAt = appointment.starts_at;
      }
    } else if (appointment.status === "no_show") {
      summary.noShows += 1;
    } else if (appointment.status === "cancelado") {
      summary.cancellations += 1;
    } else if (startsAt >= now && (!summary.nextAt || startsAt < new Date(summary.nextAt))) {
      summary.nextAt = appointment.starts_at;
    }
  }

  return summary;
}

/**
 * Orden de la lista: primero quien vino hace menos, después quien nunca vino
 * (recién cargado o con su primer turno por delante), por nombre.
 */
export function compareCustomers(
  a: { full_name: string; summary: Pick<CustomerSummary, "lastVisitAt"> },
  b: { full_name: string; summary: Pick<CustomerSummary, "lastVisitAt"> },
): number {
  const lastA = a.summary.lastVisitAt ? new Date(a.summary.lastVisitAt).getTime() : null;
  const lastB = b.summary.lastVisitAt ? new Date(b.summary.lastVisitAt).getTime() : null;
  if (lastA !== null && lastB !== null && lastA !== lastB) return lastB - lastA;
  if (lastA !== null && lastB === null) return -1;
  if (lastA === null && lastB !== null) return 1;
  return a.full_name.localeCompare(b.full_name, "es");
}

/** Sin tildes y en minúsculas: "Matías" se encuentra escribiendo "matias". */
function normalizeText(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

/**
 * ¿El cliente coincide con lo que se escribió en el buscador?
 *
 * Con letras busca en el nombre (cada palabra, en cualquier orden: "correa
 * mati" encuentra a Matías Correa). Con números busca en el DNI y en el
 * teléfono, sin importar puntos, espacios o guiones.
 */
export function matchesCustomerQuery(
  customer: { full_name: string; dni: string; phone: string },
  query: string,
): boolean {
  const text = normalizeText(query);
  if (!text) return true;

  const digits = text.replace(/\D/g, "");
  if (digits && digits.length === text.replace(/[\s.\-()+]/g, "").length) {
    return customer.dni.includes(digits) || customer.phone.replace(/\D/g, "").includes(digits);
  }

  const name = normalizeText(customer.full_name);
  return text.split(/\s+/).every((word) => name.includes(word));
}

/** "MC" para Matías Correa: el círculo de la lista y de la ficha. */
export function initials(fullName: string): string {
  const words = fullName.trim().split(/\s+/).filter(Boolean);
  const first = words[0]?.[0] ?? "";
  const last = words.length > 1 ? words[words.length - 1][0] : "";
  return (first + last).toUpperCase();
}
