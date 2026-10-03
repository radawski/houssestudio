import { addDaysToKey, dayRange, isSameMonth, monthRange, weekRange } from "@/lib/dates";
import { formatInTz, formatLongDate } from "@/lib/format";

/**
 * Navegación de la Agenda: título, URL y paso de las flechas.
 *
 * Vive fuera de la página porque el toolbar los calcula en el navegador a
 * partir de la fecha que se acaba de tocar, sin esperar al servidor
 * (tasks/plan-mejoras-octubre.md, L1): el título cambia en el mismo cuadro
 * del toque y dos ▶ seguidos avanzan dos días.
 */

export type AgendaView = "dia" | "semana" | "mes";

/** Cuánto se mueve cada flecha en Día y Semana. */
const STEP_DAYS = { dia: 1, semana: 7 } as const;

export function agendaHref(view: AgendaView, dateKey: string): string {
  return `/admin/agenda?vista=${view}&fecha=${dateKey}`;
}

/**
 * Fecha a la que lleva ◀ / ▶. En Mes va al día 1 del mes vecino (diseño
 * AgendaPeriodoMes): sumar 30 días se salteaba febrero desde un 31 de enero.
 */
export function stepDateKey(view: AgendaView, dateKey: string, direction: 1 | -1): string {
  if (view !== "mes") return addDaysToKey(dateKey, STEP_DAYS[view] * direction);

  const [year, month] = dateKey.split("-").map(Number);
  const index = year * 12 + (month - 1) + direction;
  const nextYear = Math.floor(index / 12);
  const nextMonth = (index % 12) + 1;
  return `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;
}

/**
 * El período a la vista incluye hoy: "Hoy" queda deshabilitado (no
 * dispararía una carga que no cambia nada) y de paso avisa dónde estás.
 */
export function periodContainsToday(view: AgendaView, dateKey: string, today: string): boolean {
  if (view === "dia") return dateKey === today;
  if (view === "semana") return weekRange(dateKey).days.includes(today);
  return isSameMonth(dateKey, today);
}

export function agendaTitle(view: AgendaView, dateKey: string): string {
  if (view === "dia") return formatLongDate(dayRange(dateKey).start);

  if (view === "semana") {
    const { start, days } = weekRange(dateKey);
    return `${formatInTz(start, "d 'de' MMMM")} – ${formatInTz(dayRange(days[6]).start, "d 'de' MMMM")}`;
  }

  const { monthKey } = monthRange(dateKey);
  return formatInTz(dayRange(`${monthKey}-01`).start, "MMMM yyyy");
}
