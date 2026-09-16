import { TZDate } from "@date-fns/tz";

import { BUSINESS_TIMEZONE } from "@/lib/config";

/**
 * Motor de disponibilidad.
 *
 * Es una funcion pura a proposito: no toca la base ni el reloj del sistema sin
 * que se lo pidan. Toda la logica dificil del producto (que horarios ofrecer)
 * queda asi cubierta por tests rapidos y deterministas, y la capa de datos se
 * limita a traer filas.
 */

export type Interval = { start: Date; end: Date };

export type DayHours = {
  isClosed: boolean;
  /** `HH:MM` o `HH:MM:SS`, en hora local del local. */
  opensAt: string;
  /** `HH:MM` o `HH:MM:SS`, en hora local del local. */
  closesAt: string;
};

export type ComputeSlotsInput = {
  /** Dia a resolver, `yyyy-MM-dd` en hora local del local. */
  dateKey: string;
  /** Duracion del servicio elegido, en minutos. */
  durationMinutes: number;
  /** Horario comercial del dia. `null` o cerrado devuelve cero slots. */
  hours: DayHours | null;
  /**
   * Franjas ya ocupadas: bloqueos manuales y turnos en estado `pendiente` o
   * `confirmado`. Pueden venir desordenadas, superpuestas o excediendo el dia.
   */
  busy?: Interval[];
  /** Instante actual. Inyectable para poder testear. */
  now?: Date;
  /** Anticipacion minima con la que se puede reservar. */
  minLeadMinutes?: number;
  /**
   * Ultimo dia reservable, `yyyy-MM-dd` local del local. Es el otro extremo de
   * `minLeadMinutes`: uno corta por adelante y el otro por atras.
   *
   * Lo calcula la capa de datos a partir de la configuracion, y no esta funcion,
   * para que `computeSlots` siga siendo pura y no tenga que saber que dia es hoy
   * en la zona del negocio.
   */
  maxDateKey?: string;
  timeZone?: string;
};

const MINUTE_MS = 60_000;

/** Convierte `HH:MM[:SS]` local + fecha local a un instante absoluto. */
export function businessTimeToDate(
  dateKey: string,
  time: string,
  timeZone: string = BUSINESS_TIMEZONE,
): Date {
  const [year, month, day] = dateKey.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);

  if (!year || !month || !day || Number.isNaN(hour) || Number.isNaN(minute)) {
    throw new Error(`Fecha u hora invalida: ${dateKey} ${time}`);
  }

  return new Date(
    TZDate.tz(timeZone, year, month - 1, day, hour, minute, 0, 0).getTime(),
  );
}

/** Dia de la semana (0 = domingo) de una fecha local del local. */
export function weekdayOf(dateKey: string, timeZone: string = BUSINESS_TIMEZONE): number {
  const [year, month, day] = dateKey.split("-").map(Number);
  return TZDate.tz(timeZone, year, month - 1, day, 12, 0, 0, 0).getDay();
}

/** Une intervalos que se tocan o se superponen, devolviendolos ordenados. */
export function mergeIntervals(intervals: Interval[]): Interval[] {
  if (intervals.length === 0) return [];

  const sorted = [...intervals]
    .filter((i) => i.end.getTime() > i.start.getTime())
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  const merged: Interval[] = [];
  for (const current of sorted) {
    const last = merged[merged.length - 1];
    if (last && current.start.getTime() <= last.end.getTime()) {
      if (current.end.getTime() > last.end.getTime()) last.end = current.end;
    } else {
      merged.push({ start: current.start, end: current.end });
    }
  }
  return merged;
}

/** Resta un conjunto de intervalos ocupados a un intervalo base. */
export function subtractIntervals(base: Interval, busy: Interval[]): Interval[] {
  const free: Interval[] = [];
  let cursor = base.start.getTime();
  const baseEnd = base.end.getTime();

  for (const block of mergeIntervals(busy)) {
    const blockStart = block.start.getTime();
    const blockEnd = block.end.getTime();

    if (blockEnd <= cursor) continue; // termina antes del tramo pendiente
    if (blockStart >= baseEnd) break; // los siguientes tambien caen fuera

    if (blockStart > cursor) {
      free.push({ start: new Date(cursor), end: new Date(Math.min(blockStart, baseEnd)) });
    }
    cursor = Math.max(cursor, blockEnd);
    if (cursor >= baseEnd) break;
  }

  if (cursor < baseEnd) free.push({ start: new Date(cursor), end: new Date(baseEnd) });

  return free;
}

/**
 * Calcula los horarios ofrecibles para un dia y un servicio.
 *
 * Los slots se encadenan segun la duracion del servicio: dentro de cada hueco
 * libre se arranca en el borde del hueco y se avanza de a `durationMinutes`.
 * Es el criterio que mejor aprovecha la agenda de una estacion unica, y trae
 * como consecuencia esperada que los horarios ofrecidos cambien segun el
 * servicio elegido — por eso el flujo de reserva pide el servicio antes que la
 * hora.
 *
 * Ejemplo: apertura 9:00, corte de 45 min, turno confirmado 11:00-11:45.
 * Huecos libres: 9:00-11:00 y 11:45-cierre.
 *   -> 9:00, 9:45, 10:30 no entra (terminaria 11:15), luego 11:45, 12:30, ...
 */
export function computeSlots({
  dateKey,
  durationMinutes,
  hours,
  busy = [],
  now = new Date(),
  minLeadMinutes = 0,
  maxDateKey,
  timeZone = BUSINESS_TIMEZONE,
}: ComputeSlotsInput): Interval[] {
  if (!hours || hours.isClosed) return [];
  if (durationMinutes <= 0) return [];
  // Las claves `yyyy-MM-dd` se comparan como texto sin ambiguedad, y asi no hay
  // que construir fechas para decidir algo que es una comparacion de calendario.
  if (maxDateKey && dateKey > maxDateKey) return [];

  const open = businessTimeToDate(dateKey, hours.opensAt, timeZone);
  const close = businessTimeToDate(dateKey, hours.closesAt, timeZone);
  if (close.getTime() <= open.getTime()) return [];

  const durationMs = durationMinutes * MINUTE_MS;
  const earliestStart = now.getTime() + minLeadMinutes * MINUTE_MS;

  const slots: Interval[] = [];

  for (const gap of subtractIntervals({ start: open, end: close }, busy)) {
    const gapEnd = gap.end.getTime();

    for (
      let start = gap.start.getTime();
      start + durationMs <= gapEnd;
      start += durationMs
    ) {
      if (start < earliestStart) continue;
      slots.push({ start: new Date(start), end: new Date(start + durationMs) });
    }
  }

  return slots;
}
