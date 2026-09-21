import type { Interval } from "@/lib/availability";
import { toDateKey } from "@/lib/dates";

export const WEEKDAY_SHORT = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"] as const;

export const dayNumber = (dateKey: string) => Number(dateKey.slice(8, 10));

/** Agrupa por dia local del local, que es como se lee una agenda. */
export function groupByDay<T extends { starts_at: string }>(appointments: T[]): Map<string, T[]> {
  const grouped = new Map<string, T[]>();
  for (const appointment of appointments) {
    const key = toDateKey(new Date(appointment.starts_at));
    const bucket = grouped.get(key);
    if (bucket) bucket.push(appointment);
    else grouped.set(key, [appointment]);
  }
  return grouped;
}

export type AgendaDayRow<T extends { starts_at: string }> =
  | { kind: "appointment"; appointment: T }
  | { kind: "gap"; start: Date; end: Date };

function rowStart<T extends { starts_at: string }>(row: AgendaDayRow<T>): number {
  return row.kind === "appointment" ? new Date(row.appointment.starts_at).getTime() : row.start.getTime();
}

/**
 * Intercala turnos y huecos libres en una sola lista cronologica, para la
 * vista de agenda del dia en mobile (design/admin-iphone n-Agenda).
 */
export function buildAgendaDayRows<T extends { starts_at: string }>(
  appointments: T[],
  gaps: Interval[],
): AgendaDayRow<T>[] {
  const rows: AgendaDayRow<T>[] = [
    ...appointments.map((appointment) => ({ kind: "appointment" as const, appointment })),
    ...gaps.map((gap) => ({ kind: "gap" as const, start: gap.start, end: gap.end })),
  ];

  return rows.sort((a, b) => rowStart(a) - rowStart(b));
}
