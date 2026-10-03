"use client";

import { MonthView } from "@/app/admin/agenda/month-view";
import { WeekView } from "@/app/admin/agenda/week-view";
import { DayListSkeleton } from "@/components/admin/loading-skeletons";
import { PeriodLoadingRegion, usePeriodNavigation } from "@/components/admin/period-navigation";
import { monthRange, weekRange } from "@/lib/dates";
import type { PeriodView } from "@/lib/period-nav";

const LOADING_LABEL: Record<PeriodView, string> = {
  dia: "Cargando turnos del día…",
  semana: "Cargando turnos de la semana…",
  mes: "Cargando turnos del mes…",
};

/**
 * El cuerpo de la Agenda: el contenido del servidor, o el esqueleto de la
 * vista y la fecha recién tocadas mientras carga. Se arma acá, en el
 * navegador, porque al cambiar de Día a Semana el esqueleto tiene que ser el
 * de Semana aunque el servidor todavía esté mostrando Día.
 *
 * Semana y Mes son su propio esqueleto (`appointments = null`): los días y la
 * grilla se ven desde el primer cuadro y solo esperan las barras. En Día no
 * hay nada que pintar sin datos y espera todo el bloque.
 */
export function AgendaBody({ children }: { children: React.ReactNode }) {
  const { view, dateKey, skeleton } = usePeriodNavigation();
  if (!skeleton) return <>{children}</>;

  const month = view === "mes" ? monthRange(dateKey) : null;

  return (
    <PeriodLoadingRegion label={LOADING_LABEL[view]} reveal={view === "dia" ? "block" : "bars"}>
      {view === "dia" ? (
        <DayListSkeleton />
      ) : view === "semana" ? (
        <WeekView days={weekRange(dateKey).days} appointments={null} />
      ) : month ? (
        <MonthView days={month.days} monthKey={month.monthKey} dateKey={dateKey} appointments={null} />
      ) : null}
    </PeriodLoadingRegion>
  );
}
