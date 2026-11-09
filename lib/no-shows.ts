/**
 * Historial corto de un cliente para avisarle al peluquero antes de un turno:
 * cuántas veces no vino (decisión del usuario: solo cuenta "No vino", no las
 * cancelaciones) y si es la primera vez que viene.
 *
 * Lógica pura, sin base: la consulta vive en `lib/data/appointments.ts`.
 */

import type { AppointmentStatus } from "@/lib/supabase/database.types";

export type CustomerHistory = {
  /** Turnos marcados "No vino". */
  noShows: number;
  /** Inicio del último turno al que no vino, o `null`. */
  lastNoShowAt: string | null;
  /** Turnos completados (vino y se cobró). */
  visits: number;
};

const EMPTY: CustomerHistory = { noShows: 0, lastNoShowAt: null, visits: 0 };

export function emptyHistory(): CustomerHistory {
  return { ...EMPTY };
}

/** Agrupa por cliente los turnos completados y ausentes. */
export function summarizeCustomerHistory(
  rows: { customer_id: string; status: AppointmentStatus; starts_at: string }[],
): Map<string, CustomerHistory> {
  const byCustomer = new Map<string, CustomerHistory>();

  for (const row of rows) {
    const history = byCustomer.get(row.customer_id) ?? emptyHistory();
    if (row.status === "no_show") {
      history.noShows += 1;
      if (!history.lastNoShowAt || new Date(row.starts_at) > new Date(history.lastNoShowAt)) {
        history.lastNoShowAt = row.starts_at;
      }
    } else if (row.status === "completado") {
      history.visits += 1;
    }
    byCustomer.set(row.customer_id, history);
  }

  return byCustomer;
}

/** "Faltó 1 vez" / "Faltó 3 veces", o `null` si nunca faltó. */
export function noShowCountLabel(history: CustomerHistory | null | undefined): string | null {
  if (!history || history.noShows === 0) return null;
  return history.noShows === 1 ? "Faltó 1 vez" : `Faltó ${history.noShows} veces`;
}

/** Nunca vino ni faltó: es su primer turno. */
export function isFirstVisit(history: CustomerHistory | null | undefined): boolean {
  return !history || (history.visits === 0 && history.noShows === 0);
}
