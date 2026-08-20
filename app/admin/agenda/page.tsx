import type { Metadata } from "next";

import { AgendaToolbar, type AgendaView } from "@/app/admin/agenda/agenda-toolbar";
import { DayView, MonthView, WeekView } from "@/app/admin/agenda/agenda-views";
import { getAppointmentsBetween } from "@/lib/data/appointments";
import { dayRange, monthRange, todayKey, weekRange } from "@/lib/dates";
import { formatInTz, formatLongDate } from "@/lib/format";

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

  if (view === "dia") {
    const { start, end } = dayRange(dateKey);
    const appointments = await getAppointmentsBetween(start, end);

    return (
      <div className="space-y-4">
        <AgendaToolbar view={view} dateKey={dateKey} title={formatLongDate(start)} />
        <DayView appointments={appointments} />
      </div>
    );
  }

  if (view === "semana") {
    const { start, end, days } = weekRange(dateKey);
    const appointments = await getAppointmentsBetween(start, end);

    return (
      <div className="space-y-4">
        <AgendaToolbar
          view={view}
          dateKey={dateKey}
          title={`${formatInTz(start, "d 'de' MMMM")} – ${formatInTz(dayRange(days[6]).start, "d 'de' MMMM")}`}
        />
        <WeekView days={days} appointments={appointments} />
      </div>
    );
  }

  const { start, end, days, monthKey } = monthRange(dateKey);
  const appointments = await getAppointmentsBetween(start, end);

  return (
    <div className="space-y-4">
      <AgendaToolbar
        view={view}
        dateKey={dateKey}
        title={formatInTz(dayRange(`${monthKey}-01`).start, "MMMM yyyy")}
      />
      <MonthView days={days} monthKey={monthKey} appointments={appointments} />
    </div>
  );
}
