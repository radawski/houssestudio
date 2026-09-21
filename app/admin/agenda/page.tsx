import type { Metadata } from "next";

import { AgendaToolbar, type AgendaView } from "@/app/admin/agenda/agenda-toolbar";
import { DayView, MonthView, WeekView } from "@/app/admin/agenda/agenda-views";
import { computeFreeGaps } from "@/lib/availability";
import {
  getActiveServices,
  getAppointmentsBetween,
  getBusinessHoursForDay,
  getTimeBlocksForDay,
} from "@/lib/data/appointments";
import { dayRange, monthRange, todayKey, weekRange } from "@/lib/dates";
import { formatInTz, formatLongDate } from "@/lib/format";
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

  const services = await getActiveServices();

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
      <div className="space-y-4 pb-20 md:pb-0">
        <AgendaToolbar
          view={view}
          dateKey={dateKey}
          title={formatLongDate(start)}
          services={services}
        />
        <DayView appointments={appointments} gaps={gaps} />
      </div>
    );
  }

  if (view === "semana") {
    const { start, end, days } = weekRange(dateKey);
    const appointments = await getAppointmentsBetween(start, end);

    return (
      <div className="space-y-4 pb-20 md:pb-0">
        <AgendaToolbar
          view={view}
          dateKey={dateKey}
          title={`${formatInTz(start, "d 'de' MMMM")} – ${formatInTz(dayRange(days[6]).start, "d 'de' MMMM")}`}
          services={services}
        />
        <WeekView days={days} appointments={appointments} />
      </div>
    );
  }

  const { start, end, days, monthKey } = monthRange(dateKey);
  const appointments = await getAppointmentsBetween(start, end);

  return (
    <div className="space-y-4 pb-20 md:pb-0">
      <AgendaToolbar
        view={view}
        dateKey={dateKey}
        title={formatInTz(dayRange(`${monthKey}-01`).start, "MMMM yyyy")}
        services={services}
      />
      <MonthView days={days} monthKey={monthKey} dateKey={dateKey} appointments={appointments} />
    </div>
  );
}
