import { addDaysToKey, dayRange, todayKey } from "@/lib/dates";

/**
 * Recordatorios (Fase 3, tasks/plan-recordatorios.md) — funciones puras.
 *
 * La tarea diaria corre a la mañana y avisa de los turnos del día siguiente,
 * contado como día de calendario en la zona del local: a las 10 del martes,
 * "mañana" es todo el miércoles, de 00:00 a 00:00.
 */

/** Rango absoluto del día siguiente al de `now`, en la zona del local. */
export function tomorrowRange(now: Date = new Date()): { start: Date; end: Date; dateKey: string } {
  const dateKey = addDaysToKey(todayKey(now), 1);
  return { ...dayRange(dateKey), dateKey };
}

export type ReminderCandidate = {
  id: string;
  status: string;
  email: string | null;
  alreadyReminded: boolean;
};

/**
 * Qué turnos reciben recordatorio: confirmados (no pendientes ni
 * cancelados), con email del cliente y sin un recordatorio ya enviado. El
 * resto se cuenta como salteado.
 */
export function pickReminders<T extends ReminderCandidate>(candidates: T[]): { send: T[]; skipped: number } {
  const send = candidates.filter(
    (candidate) => candidate.status === "confirmado" && Boolean(candidate.email?.trim()) && !candidate.alreadyReminded,
  );
  return { send, skipped: candidates.length - send.length };
}
