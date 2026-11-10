import { businessTimeToDate, type DayHours, type Interval } from "@/lib/availability";

/**
 * Turno fijo (plan de noviembre, T2): la parte pura.
 *
 * Una regla dice "este cliente viene los miércoles a las 17:00 cada 2
 * semanas" (o "el 2° martes de cada mes"). De ella salen las fechas; la capa
 * de datos (`lib/data/recurring.ts`) mantiene agendadas siempre las próximas
 * `OCCURRENCES_AHEAD` y saltea las que no entran.
 *
 * Las fechas se manejan como claves `yyyy-MM-dd` locales: el día de la semana
 * de una fecha de calendario no depende de la zona horaria, así que la
 * aritmética va en UTC sin corrimientos.
 */

/** Cuántas fechas futuras quedan siempre agendadas por regla (decisión del usuario). */
export const OCCURRENCES_AHEAD = 4;

/** Lo que se elige en "Repetir" de la hoja "Nuevo turno". */
export type RepeatChoice = "no" | "1" | "2" | "3" | "mes";

export const REPEAT_OPTIONS: { value: RepeatChoice; label: string }[] = [
  { value: "no", label: "No" },
  { value: "1", label: "1 sem" },
  { value: "2", label: "2 sem" },
  { value: "3", label: "3 sem" },
  { value: "mes", label: "Mes" },
];

export type RecurrenceRule = {
  /** Primera fecha, `yyyy-MM-dd`. Da el día de la semana. */
  anchorDate: string;
  everyWeeks: 1 | 2 | 3 | null;
  /** 1–5; el 5 es "el último" en los meses que no tienen quinto. */
  monthlyNth: number | null;
};

const DAY_MS = 86_400_000;

function parseKey(dateKey: string): [number, number, number] {
  const [year, month, day] = dateKey.split("-").map(Number);
  return [year, month, day];
}

function utcDay(dateKey: string): number {
  const [year, month, day] = parseKey(dateKey);
  return Date.UTC(year, month - 1, day) / DAY_MS;
}

function keyFromUtcDay(days: number): string {
  return new Date(days * DAY_MS).toISOString().slice(0, 10);
}

/** Día de la semana de una fecha de calendario (0 = domingo). */
export function weekdayOfKey(dateKey: string): number {
  const [year, month, day] = parseKey(dateKey);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

/** Qué número de ese día de la semana es dentro del mes: el 11/11 es el 2° miércoles. */
export function nthOfMonth(dateKey: string): number {
  return Math.ceil(parseKey(dateKey)[2] / 7);
}

/**
 * El n-ésimo `weekday` de un mes (`month` 1–12). Si el mes no tiene ese
 * n-ésimo (un quinto miércoles), devuelve el último.
 */
export function nthWeekdayOfMonth(year: number, month: number, weekday: number, nth: number): string {
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  let day = 1 + ((weekday - firstWeekday + 7) % 7) + (nth - 1) * 7;
  while (day > daysInMonth) day -= 7;
  return keyFromUtcDay(Date.UTC(year, month - 1, day) / DAY_MS);
}

/** La regla que sale de lo elegido en "Repetir" para una primera fecha. */
export function ruleFromChoice(choice: RepeatChoice, anchorDate: string): RecurrenceRule | null {
  if (choice === "no") return null;
  if (choice === "mes") return { anchorDate, everyWeeks: null, monthlyNth: nthOfMonth(anchorDate) };
  return { anchorDate, everyWeeks: Number(choice) as 1 | 2 | 3, monthlyNth: null };
}

/**
 * Las primeras `count` fechas de la regla desde `fromKey` (inclusive), nunca
 * antes de la primera fecha.
 */
export function occurrenceDates(rule: RecurrenceRule, fromKey: string, count: number): string[] {
  const from = Math.max(utcDay(rule.anchorDate), utcDay(fromKey));
  const dates: string[] = [];

  if (rule.everyWeeks) {
    const step = rule.everyWeeks * 7;
    const anchor = utcDay(rule.anchorDate);
    let day = anchor + Math.ceil((from - anchor) / step) * step;
    while (dates.length < count) {
      dates.push(keyFromUtcDay(day));
      day += step;
    }
    return dates;
  }

  if (rule.monthlyNth) {
    const weekday = weekdayOfKey(rule.anchorDate);
    const [fromYear, fromMonth] = parseKey(keyFromUtcDay(from));
    // Se empieza un mes antes por las dudas: la fecha del mes de `from`
    // puede caer antes que `from` y entonces vale la del mes siguiente.
    for (let offset = 0; dates.length < count && offset < count + 24; offset++) {
      const year = fromYear + Math.floor((fromMonth - 1 + offset) / 12);
      const month = ((fromMonth - 1 + offset) % 12) + 1;
      const date = nthWeekdayOfMonth(year, month, weekday, rule.monthlyNth);
      if (utcDay(date) >= from) dates.push(date);
    }
    return dates;
  }

  return dates;
}

const WEEKDAYS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const ORDINALS = ["", "1°", "2°", "3°", "4°", "último"];

/** "Cada 2 semanas", "Cada semana", "Cada mes · 2° miércoles". */
export function describeFrequency(rule: RecurrenceRule): string {
  if (rule.everyWeeks === 1) return "Cada semana";
  if (rule.everyWeeks) return `Cada ${rule.everyWeeks} semanas`;
  if (rule.monthlyNth) {
    return `Cada mes · ${ORDINALS[rule.monthlyNth]} ${WEEKDAYS[weekdayOfKey(rule.anchorDate)]}`;
  }
  return "";
}

/** "Miércoles 17:00". */
export function describeSlot(rule: RecurrenceRule, startTime: string): string {
  const weekday = WEEKDAYS[weekdayOfKey(rule.anchorDate)];
  return `${weekday[0].toUpperCase()}${weekday.slice(1)} ${startTime.slice(0, 5)}`;
}

/** "11/11" o "el 11/11, 25/11, 9/12 y 23/12". */
export function listDates(dates: string[]): string {
  const short = dates.map((date) => {
    const [, month, day] = parseKey(date);
    return `${day}/${month}`;
  });
  if (short.length <= 1) return short.join("");
  return `${short.slice(0, -1).join(", ")} y ${short[short.length - 1]}`;
}

/**
 * Si una fecha del turno fijo entra en la agenda. No usa la grilla de la
 * reserva online: la grilla se encadena desde los turnos que ya hay y se
 * corre con cada reserva, así que el horario fijo casi nunca coincidiría.
 * Alcanza con que caiga dentro del horario de atención y no pise nada.
 *
 * Devuelve `null` si entra, o el motivo (la frase que ve el peluquero).
 */
export function occurrenceProblem({
  dateKey,
  slot,
  hours,
  blocks,
  taken,
}: {
  dateKey: string;
  slot: Interval;
  hours: DayHours | null;
  blocks: (Interval & { reason: string | null })[];
  taken: Interval[];
}): string | null {
  if (!hours || hours.isClosed || hours.ranges.length === 0) return "El local está cerrado ese día.";

  const inHours = hours.ranges.some((range) => {
    const opens = businessTimeToDate(dateKey, range.opensAt).getTime();
    const closes = businessTimeToDate(dateKey, range.closesAt).getTime();
    return slot.start.getTime() >= opens && slot.end.getTime() <= closes;
  });
  if (!inHours) return "Queda fuera del horario de atención.";

  const overlaps = (other: Interval) =>
    other.start.getTime() < slot.end.getTime() && other.end.getTime() > slot.start.getTime();

  const block = blocks.find(overlaps);
  if (block) {
    return block.reason ? `El horario está bloqueado (“${block.reason}”).` : "El horario está bloqueado.";
  }
  if (taken.some(overlaps)) return "Ya hay otro turno en ese horario.";
  return null;
}
