import { COMEBACK_MAX_DAYS, daysBetweenKeys } from "@/lib/comebacks";
import { addDaysToKey } from "@/lib/dates";
import { weekdayOfKey } from "@/lib/recurring";
import type { AppointmentStatus } from "@/lib/supabase/database.types";

/**
 * Estadísticas (plan de noviembre, E1): los cálculos, como funciones puras.
 * La capa de datos (`lib/data/stats.ts`) trae las filas y la página solo
 * dibuja. Las fechas van como claves `yyyy-MM-dd` locales del local.
 */

/** Variación porcentual redondeada, o `null` si no hay con qué comparar. */
export function percentChange(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

/** Qué parte de `total` es `part`, en porcentaje redondeado (0 sin total). */
export function share(part: number, total: number): number {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}

// --- Turnos -------------------------------------------------------------------

export type Outcomes = {
  /** Todos los turnos del período, en cualquier estado. */
  total: number;
  attended: number;
  cancelled: number;
  noShow: number;
  /** Pendientes o confirmados: todavía no pasaron (o no se cerraron). */
  open: number;
};

export function countOutcomes(statuses: AppointmentStatus[]): Outcomes {
  const outcomes: Outcomes = { total: statuses.length, attended: 0, cancelled: 0, noShow: 0, open: 0 };
  for (const status of statuses) {
    if (status === "completado") outcomes.attended += 1;
    else if (status === "cancelado") outcomes.cancelled += 1;
    else if (status === "no_show") outcomes.noShow += 1;
    else outcomes.open += 1;
  }
  return outcomes;
}

// --- Clientes -------------------------------------------------------------------

/** Un turno atendido (`completado`): una visita. */
export type Visit = { customerId: string; dateKey: string };

/** Fechas de visita de cada cliente, sin repetir y en orden. */
function visitsByCustomer(visits: Visit[], untilKey?: string): Map<string, string[]> {
  const map = new Map<string, Set<string>>();
  for (const visit of visits) {
    if (untilKey && visit.dateKey > untilKey) continue;
    let dates = map.get(visit.customerId);
    if (!dates) map.set(visit.customerId, (dates = new Set()));
    dates.add(visit.dateKey);
  }
  return new Map([...map].map(([id, dates]) => [id, [...dates].sort()]));
}

/**
 * Clientes atendidos en el período (`startKey` a `endKey`, inclusive):
 * nuevos (su primera visita cae en el período) y los que vuelven.
 */
export function newVsReturning(visits: Visit[], startKey: string, endKey: string): { nuevos: number; vuelven: number } {
  let nuevos = 0;
  let vuelven = 0;
  for (const dates of visitsByCustomer(visits, endKey).values()) {
    if (!dates.some((date) => date >= startKey)) continue;
    if (dates[0] >= startKey) nuevos += 1;
    else vuelven += 1;
  }
  return { nuevos, vuelven };
}

export const RETURN_BUCKETS = [
  { label: "Menos de 15 días", max: 14 },
  { label: "15 a 30 días", max: 30 },
  { label: "31 a 45 días", max: 45 },
  { label: "46 a 60 días", max: 60 },
  { label: "Más de 60 días", max: Number.POSITIVE_INFINITY },
] as const;

export type ReturnFrequency = {
  /** Días promedio entre visitas, o `null` si no hay clientes activos. */
  average: number | null;
  customers: number;
  buckets: { label: string; count: number }[];
};

/**
 * Frecuencia media de retorno: "Cuántos días pasan, en promedio, hasta que
 * un cliente vuelve". Cuenta solo a los clientes activos a `referenceKey`: 2
 * o más visitas y la última hace menos de 60 días (`COMEBACK_MAX_DAYS`, el
 * mismo corte que el mail para volver). Cada cliente aporta su promedio
 * propio, así el que viene cada semana no pesa más que el resto.
 */
export function returnFrequency(visits: Visit[], referenceKey: string): ReturnFrequency {
  const averages: number[] = [];
  for (const dates of visitsByCustomer(visits, referenceKey).values()) {
    if (dates.length < 2) continue;
    const last = dates[dates.length - 1];
    if (daysBetweenKeys(last, referenceKey) >= COMEBACK_MAX_DAYS) continue;
    averages.push(daysBetweenKeys(dates[0], last) / (dates.length - 1));
  }

  const buckets = RETURN_BUCKETS.map((bucket) => ({ label: bucket.label, count: 0 }));
  for (const average of averages) {
    const index = RETURN_BUCKETS.findIndex((bucket) => Math.round(average) <= bucket.max);
    buckets[index].count += 1;
  }

  return {
    average: averages.length ? Math.round(averages.reduce((a, b) => a + b, 0) / averages.length) : null,
    customers: averages.length,
    buckets,
  };
}

// --- Mismo día, semana a semana ---------------------------------------------

/** El último `weekday` (0 = domingo) en `anchorKey` o antes. */
export function latestWeekdayOnOrBefore(anchorKey: string, weekday: number): string {
  const back = (weekdayOfKey(anchorKey) - weekday + 7) % 7;
  return addDaysToKey(anchorKey, -back);
}

export type SeriesPoint = { dateKey: string; value: number };

/** `latestKey` y el mismo día de las semanas anteriores; el más reciente primero. */
export function sameWeekdaySeries(values: Record<string, number>, latestKey: string, weeks = 8): SeriesPoint[] {
  return Array.from({ length: weeks }, (_, index) => {
    const dateKey = addDaysToKey(latestKey, -7 * index);
    return { dateKey, value: values[dateKey] ?? 0 };
  });
}

/**
 * El día más reciente contra la semana anterior y contra el promedio de las
 * semanas anteriores (sin contarlo a él).
 */
export function compareSeries(series: SeriesPoint[]): {
  latest: number;
  average: number;
  vsPrevious: number | null;
  vsAverage: number | null;
} {
  const [latest, ...older] = series.map((point) => point.value);
  const average = older.length ? Math.round(older.reduce((a, b) => a + b, 0) / older.length) : 0;
  return {
    latest: latest ?? 0,
    average,
    vsPrevious: older.length ? latest - older[0] : null,
    vsAverage: older.length ? latest - average : null,
  };
}

// --- Movimiento -----------------------------------------------------------------

export type HourBand = { from: number; to: number };

/** Franjas de `step` horas entre la primera apertura y el último cierre. */
export function hourBands(openHour: number, closeHour: number, step = 2): HourBand[] {
  const bands: HourBand[] = [];
  for (let from = openHour; from < closeHour; from += step) bands.push({ from, to: Math.min(from + step, closeHour) });
  return bands;
}

export const HEATMAP_LEVELS = 5;

export type Heatmap = {
  weekdays: number[];
  rows: { band: HourBand; cells: { weekday: number; count: number; level: number }[] }[];
  busiest: { weekday: number; band: HourBand; count: number } | null;
};

/**
 * Turnos atendidos por día de la semana y franja horaria. `level` va de 0
 * (ninguno) a 4 (el máximo del período), para el tono de cada celda.
 */
export function buildHeatmap(
  starts: { weekday: number; minutes: number }[],
  bands: HourBand[],
  weekdays: number[],
): Heatmap {
  const counts = bands.map(() => weekdays.map(() => 0));
  for (const start of starts) {
    const col = weekdays.indexOf(start.weekday);
    const row = bands.findIndex((band) => start.minutes >= band.from * 60 && start.minutes < band.to * 60);
    if (col >= 0 && row >= 0) counts[row][col] += 1;
  }

  const max = Math.max(0, ...counts.flat());
  let busiest: Heatmap["busiest"] = null;
  const rows = bands.map((band, r) => ({
    band,
    cells: weekdays.map((weekday, c) => {
      const count = counts[r][c];
      if (count > 0 && (!busiest || count > busiest.count)) busiest = { weekday, band, count };
      return { weekday, count, level: max ? Math.ceil((count / max) * (HEATMAP_LEVELS - 1)) : 0 };
    }),
  }));

  return { weekdays, rows, busiest };
}

const WEEKDAYS_PLURAL = ["domingos", "lunes", "martes", "miércoles", "jueves", "viernes", "sábados"];

/** "sábados de 11 a 13". */
export function describeBusiest(busiest: NonNullable<Heatmap["busiest"]>): string {
  return `${WEEKDAYS_PLURAL[busiest.weekday]} de ${busiest.band.from} a ${busiest.band.to}`;
}

/** "+3", "−2" o "=". */
export function signed(value: number, format: (n: number) => string = String): string {
  if (value === 0) return "=";
  return `${value > 0 ? "+" : "−"}${format(Math.abs(value))}`;
}
