import { TZDate } from "@date-fns/tz";
import { addDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from "date-fns";

import { businessTimeToDate } from "@/lib/availability";
import { BUSINESS_TIMEZONE } from "@/lib/config";

/**
 * Utilidades de calendario en hora local del local.
 *
 * En toda la app las fechas de agenda se identifican por su clave local
 * `yyyy-MM-dd` y no por un `Date`. Un `Date` arrastra una hora que induce a
 * error al cruzar zonas horarias: `new Date("2026-08-18")` es el 17 a las 21 hs
 * en Argentina, y esa clase de corrimiento hace que un turno aparezca en el dia
 * equivocado.
 */

export function toDateKey(date: Date): string {
  const tz = new TZDate(date, BUSINESS_TIMEZONE);
  const month = String(tz.getMonth() + 1).padStart(2, "0");
  const day = String(tz.getDate()).padStart(2, "0");
  return `${tz.getFullYear()}-${month}-${day}`;
}

export function todayKey(now: Date = new Date()): string {
  return toDateKey(now);
}

export function addDaysToKey(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  return toDateKey(new Date(Date.UTC(year, month - 1, day + days, 12)));
}

/** Instantes absolutos que delimitan un dia local del local. */
export function dayRange(dateKey: string): { start: Date; end: Date } {
  return {
    start: businessTimeToDate(dateKey, "00:00"),
    end: businessTimeToDate(addDaysToKey(dateKey, 1), "00:00"),
  };
}

/** Semana de lunes a domingo que contiene la fecha dada. */
export function weekRange(dateKey: string): { start: Date; end: Date; days: string[] } {
  const anchor = businessTimeToDate(dateKey, "12:00");
  const tzAnchor = new TZDate(anchor, BUSINESS_TIMEZONE);
  const firstKey = toDateKey(startOfWeek(tzAnchor, { weekStartsOn: 1 }));
  const days = Array.from({ length: 7 }, (_, i) => addDaysToKey(firstKey, i));

  return {
    start: dayRange(firstKey).start,
    end: dayRange(days[6]).end,
    days,
  };
}

/**
 * Grilla mensual completa, incluidos los dias de relleno del mes anterior y del
 * siguiente para que el calendario siempre muestre semanas enteras.
 */
export function monthRange(dateKey: string): {
  start: Date;
  end: Date;
  days: string[];
  monthKey: string;
} {
  const anchor = new TZDate(businessTimeToDate(dateKey, "12:00"), BUSINESS_TIMEZONE);
  const gridStart = startOfWeek(startOfMonth(anchor), { weekStartsOn: 1 });
  const gridEnd = endOfWeek(endOfMonth(anchor), { weekStartsOn: 1 });

  const days: string[] = [];
  for (let d = gridStart; d <= gridEnd; d = addDays(d, 1)) days.push(toDateKey(d));

  return {
    start: dayRange(days[0]).start,
    end: dayRange(days[days.length - 1]).end,
    days,
    monthKey: dateKey.slice(0, 7),
  };
}

/** `true` si la clave de fecha pertenece al mes de la clave de referencia. */
export function isSameMonth(dateKey: string, referenceKey: string): boolean {
  return dateKey.slice(0, 7) === referenceKey.slice(0, 7);
}
