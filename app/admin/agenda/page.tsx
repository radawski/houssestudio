import type { Metadata } from "next";

import { AgendaBody, AgendaNavigation } from "@/app/admin/agenda/agenda-navigation";
import { AgendaToolbar } from "@/app/admin/agenda/agenda-toolbar";
import { DayView, MonthView, WeekView } from "@/app/admin/agenda/agenda-views";
import { DayListSkeleton } from "@/components/admin/loading-skeletons";
import { computeFreeGaps } from "@/lib/availability";
import {
  getAppointmentsBetween,
  getBusinessHoursForDay,
  getTimeBlocksForDay,
} from "@/lib/data/appointments";
import type { AgendaView } from "@/lib/agenda-nav";
import { getSaleCatalog } from "@/lib/data/products";
import { dayRange, monthRange, todayKey, weekRange } from "@/lib/dates";
import type { AppointmentStatus } from "@/lib/supabase/database.types";

/**
 * Estados que ocupan la agenda a efectos de mostrar huecos libres. No es
 * `getBusyIntervals` de `lib/data/availability.ts` (que sirve a la reserva
 * publica y sólo cuenta pendiente/confirmado): un turno completado también
 * ocupó el horario, así que un día ya pasado no debe verse todo libre.
 */
const GAP_BUSY_STATUSES: readonly AppointmentStatus[] = ["pendiente", "confirmado", "completado"];

export const metadata: Metadata = { title: "Agenda" };

export const dynamic = "force-dynamic";

const VIEWS: AgendaView[] = ["dia", "semana", "mes"];

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export default async function AgendaPage({ searchParams }: PageProps<"/admin/agenda">) {
  const { vista, fecha } = await searchParams;

  // Los parámetros vienen de la URL, así que se saneen antes de usarlos: una
  // fecha basura llegaría hasta el cálculo de rangos y reventaría la página.
  const view = VIEWS.includes(vista as AgendaView) ? (vista as AgendaView) : "dia";
  const dateKey =
    typeof fecha === "string" && DATE_KEY_PATTERN.test(fecha) ? fecha : todayKey();

  const catalog = await getSaleCatalog();

  if (view === "dia") {
    const { start, end } = dayRange(dateKey);
    const [appointments, hours, blocks] = await Promise.all([
      getAppointmentsBetween(start, end),
      getBusinessHoursForDay(dateKey),
      getTimeBlocksForDay(dateKey),
    ]);

    const busy = [
      ...appointments
        .filter((appointment) => GAP_BUSY_STATUSES.includes(appointment.status))
        .map((appointment) => ({
          start: new Date(appointment.starts_at),
          end: new Date(appointment.ends_at),
        })),
      ...blocks,
    ];
    const gaps = computeFreeGaps({ dateKey, hours, busy });

    return (
      <AgendaNavigation view={view} dateKey={dateKey}>
        <div className="space-y-4 pb-20 md:pb-0">
          <AgendaToolbar catalog={catalog} />
          <AgendaBody skeleton={<DayListSkeleton />}>
            <DayView appointments={appointments} gaps={gaps} />
          </AgendaBody>
        </div>
      </AgendaNavigation>
    );
  }

  if (view === "semana") {
    const { start, end, days } = weekRange(dateKey);
    const appointments = await getAppointmentsBetween(start, end);

    return (
      <AgendaNavigation view={view} dateKey={dateKey}>
        <div className="space-y-4 pb-20 md:pb-0">
          <AgendaToolbar catalog={catalog} />
          <WeekView days={days} appointments={appointments} />
        </div>
      </AgendaNavigation>
    );
  }

  const { start, end, days, monthKey } = monthRange(dateKey);
  const appointments = await getAppointmentsBetween(start, end);

  return (
    <AgendaNavigation view={view} dateKey={dateKey}>
      <div className="space-y-4 pb-20 md:pb-0">
        <AgendaToolbar catalog={catalog} />
        <MonthView days={days} monthKey={monthKey} dateKey={dateKey} appointments={appointments} />
      </div>
    </AgendaNavigation>
  );
}
