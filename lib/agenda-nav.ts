import { addDaysToKey, dayRange, monthRange, weekRange } from "@/lib/dates";
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

/** Cuánto se mueve cada flecha según la vista activa. */
const STEP_DAYS: Record<AgendaView, number> = { dia: 1, semana: 7, mes: 30 };

export function agendaHref(view: AgendaView, dateKey: string): string {
  return `/admin/agenda?vista=${view}&fecha=${dateKey}`;
}

export function stepDateKey(view: AgendaView, dateKey: string, direction: 1 | -1): string {
  return addDaysToKey(dateKey, STEP_DAYS[view] * direction);
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
