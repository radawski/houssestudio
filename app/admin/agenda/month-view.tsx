import Link from "next/link";

import { MonthMobileView } from "@/app/admin/agenda/month-mobile";
import { EventChip } from "@/app/admin/agenda/week-view";
import { dayNumber, groupByDay, WEEKDAY_SHORT } from "@/lib/agenda-day";
import type { AppointmentWithCustomer } from "@/lib/data/appointments";
import { isSameMonth, todayKey } from "@/lib/dates";
import { cn } from "@/lib/utils";

/**
 * Vista mes. Con `appointments = null` es su propio esqueleto (diseño
 * "Estados de carga", n-AgendaVistaMes): la grilla es real porque los números
 * no dependen de datos, y solo faltan las marcas de "tiene turnos" y la lista
 * del día elegido, que aparecen al llegar sin mover la grilla.
 *
 * Como `WeekView`, no depende de componentes de servidor: la usa también el
 * esqueleto que se arma en el navegador.
 */
export function MonthView({
  days,
  monthKey,
  dateKey,
  appointments,
}: {
  days: string[];
  monthKey: string;
  dateKey: string;
  appointments: AppointmentWithCustomer[] | null;
}) {
  const grouped = appointments ? groupByDay(appointments) : null;
  const today = todayKey();

  return (
    <>
      {/* `key`: el día elegido es estado propio de la vista; al cambiar de
          mes (o de fecha) arranca de nuevo en la fecha pedida. */}
      <MonthMobileView
        key={dateKey}
        days={days}
        monthKey={monthKey}
        appointments={appointments}
        initialSelectedKey={dateKey}
      />

      <div className="hidden overflow-x-auto md:block">
      <div className="grid min-w-160 grid-cols-7 gap-px rounded-lg border bg-border">
        {WEEKDAY_SHORT.map((label) => (
          <div
            key={label}
            className="bg-muted text-muted-foreground px-2 py-1.5 text-center text-xs font-medium"
          >
            {label}
          </div>
        ))}

        {days.map((cellKey) => {
          const dayAppointments = grouped?.get(cellKey) ?? [];
          const inMonth = isSameMonth(cellKey, `${monthKey}-01`);

          return (
            <Link
              key={cellKey}
              href={`/admin/agenda?vista=dia&fecha=${cellKey}`}
              className={cn(
                "bg-background hover:bg-accent min-h-24 space-y-1 p-1.5 transition-colors",
                !inMonth && "bg-muted/40",
              )}
            >
              <span
                className={cn(
                  "inline-flex size-6 items-center justify-center rounded-full text-xs tabular-nums",
                  !inMonth && "text-muted-foreground",
                  cellKey === today && "bg-foreground text-background font-medium",
                )}
              >
                {dayNumber(cellKey)}
              </span>

              {/* Más de tres chips no entran sin romper la altura de la celda;
                  el resto se resume en un contador. */}
              {dayAppointments.slice(0, 3).map((appointment) => (
                <EventChip key={appointment.id} appointment={appointment} />
              ))}
              {dayAppointments.length > 3 ? (
                <p className="text-muted-foreground px-1.5 text-xs">
                  +{dayAppointments.length - 3} más
                </p>
              ) : null}
            </Link>
          );
        })}
      </div>
      </div>
    </>
  );
}
