import Link from "next/link";

import { MonthMobileView } from "@/app/admin/agenda/month-mobile";
import { AppointmentCard } from "@/components/admin/appointment-card";
import { AppointmentSheet } from "@/components/admin/appointment-sheet";
import { AdminStatusBadge } from "@/components/admin/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { buildAgendaDayRows, dayNumber, groupByDay, WEEKDAY_SHORT } from "@/lib/agenda-day";
import type { Interval } from "@/lib/availability";
import type { AppointmentWithCustomer } from "@/lib/data/appointments";
import { isSameMonth, todayKey } from "@/lib/dates";
import { formatCurrency, formatTime } from "@/lib/format";
import { STATUS_META } from "@/lib/status";
import { cn } from "@/lib/utils";

function EmptyDay({ label = "Sin turnos." }: { label?: string }) {
  return (
    <Card>
      <CardContent className="text-muted-foreground py-10 text-center text-sm">
        {label}
      </CardContent>
    </Card>
  );
}

/** Fila [hora][hueco] de la lista mobile del dia (design/admin-iphone n-Agenda). */
function GapRow({ start, end }: { start: Date; end: Date }) {
  const minutes = Math.round((end.getTime() - start.getTime()) / 60_000);

  return (
    <div className="flex gap-2.5">
      <span className="text-muted-foreground w-11 shrink-0 pt-0.5 text-right text-xs font-medium tabular-nums">
        {formatTime(start)}
      </span>
      <div className="text-muted-foreground flex h-11 flex-1 items-center rounded-md border border-dashed border-[var(--hs-mist)] px-3 text-sm">
        Libre · {minutes} min
      </div>
    </div>
  );
}

/**
 * Fila [hora][tarjeta] de la lista mobile del dia. La tarjeta abre la ficha
 * de solo lectura (n-Agenda: "sin botones adentro, un boton dentro de un
 * link se traga el toque") — a diferencia de la fila de acciones que usa
 * `AppointmentCard` en Hoy/Solicitudes.
 */
function AgendaAppointmentRow({ appointment }: { appointment: AppointmentWithCustomer }) {
  return (
    <div className="flex gap-2.5">
      <span className="text-muted-foreground w-11 shrink-0 pt-0.5 text-right text-xs font-medium tabular-nums">
        {formatTime(appointment.starts_at)}
      </span>
      <Dialog>
        <DialogTrigger asChild>
          <button
            type="button"
            className="bg-card min-w-0 flex-1 rounded-md border border-[var(--hs-border-card)] p-3 text-left"
          >
            <div className="flex items-start justify-between gap-2.5">
              <p className="text-sm font-semibold tabular-nums">
                {formatTime(appointment.starts_at)} – {formatTime(appointment.ends_at)}
              </p>
              <AdminStatusBadge status={appointment.status} />
            </div>
            <p className="mt-1.5 text-sm font-medium">
              {appointment.customer?.full_name ?? "Cliente eliminado"}
            </p>
            <p className="text-muted-foreground mt-0.5 text-xs tabular-nums">
              {appointment.service_name_at_booking} · {formatCurrency(appointment.price_at_booking)}
            </p>
          </button>
        </DialogTrigger>
        <AppointmentSheet appointment={appointment} />
      </Dialog>
    </div>
  );
}

export function DayView({
  appointments,
  gaps,
}: {
  appointments: AppointmentWithCustomer[];
  gaps: Interval[];
}) {
  const rows = buildAgendaDayRows(appointments, gaps);

  return (
    <>
      <div className="flex flex-col gap-2.5 md:hidden">
        {rows.length === 0 ? (
          <EmptyDay />
        ) : (
          rows.map((row) =>
            row.kind === "appointment" ? (
              <AgendaAppointmentRow key={row.appointment.id} appointment={row.appointment} />
            ) : (
              <GapRow key={row.start.toISOString()} start={row.start} end={row.end} />
            ),
          )
        )}
      </div>

      <div className="hidden md:block">
        {appointments.length === 0 ? (
          <EmptyDay />
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {appointments.map((appointment) => (
              <AppointmentCard key={appointment.id} appointment={appointment} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

/** Chip compacto usado en las vistas de semana y mes. */
function EventChip({ appointment }: { appointment: AppointmentWithCustomer }) {
  return (
    <div
      className={cn(
        "truncate rounded border px-1.5 py-0.5 text-xs",
        STATUS_META[appointment.status].event,
      )}
      title={`${formatTime(appointment.starts_at)} · ${appointment.customer?.full_name ?? ""} · ${STATUS_META[appointment.status].label}`}
    >
      <span className="tabular-nums">{formatTime(appointment.starts_at)}</span>{" "}
      {appointment.customer?.full_name}
    </div>
  );
}

export function WeekView({
  days,
  appointments,
}: {
  days: string[];
  appointments: AppointmentWithCustomer[];
}) {
  const grouped = groupByDay(appointments);
  const today = todayKey();

  return (
    <>
      {/* Lista vertical por dia (design/admin-iphone n-AgendaSemana): a 390px la
          grilla de 7 columnas del escritorio queda en 50px por columna, un
          modelo de interaccion distinto que no vale la pena forzar a un solo
          componente. */}
      <div className="flex flex-col md:hidden">
        {days.map((dateKey, index) => {
          const dayAppointments = grouped.get(dateKey) ?? [];
          const isToday = dateKey === today;

          return (
            <div
              key={dateKey}
              className={cn("flex gap-2.5 py-3", index > 0 && "border-t border-[var(--hs-border-card)]")}
            >
              <div className="flex w-10 shrink-0 flex-col items-center gap-0.5">
                <span className="text-muted-foreground text-[10px] uppercase tracking-wide">
                  {WEEKDAY_SHORT[index]}
                </span>
                <span
                  className={cn(
                    "flex size-[30px] items-center justify-center text-[15px] font-semibold tabular-nums",
                    isToday && "bg-foreground text-background rounded-full",
                  )}
                >
                  {dayNumber(dateKey)}
                </span>
              </div>

              {dayAppointments.length === 0 ? (
                <div className="text-muted-foreground flex h-[38px] flex-1 items-center rounded-md border border-dashed border-[var(--hs-mist)] px-2.5 text-sm">
                  Sin turnos
                </div>
              ) : (
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  {dayAppointments.map((appointment) => (
                    <div
                      key={appointment.id}
                      className="bg-card flex items-center justify-between gap-2.5 rounded-md border border-[var(--hs-border-card)] px-2.5 py-2 text-xs"
                    >
                      <span className="text-muted-foreground min-w-0 truncate">
                        <strong className="text-foreground font-semibold tabular-nums">
                          {formatTime(appointment.starts_at)}
                        </strong>{" "}
                        · {appointment.customer?.full_name ?? "Cliente eliminado"}
                      </span>
                      <AdminStatusBadge status={appointment.status} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="hidden gap-3 sm:grid-cols-2 md:grid lg:grid-cols-4">
        {days.map((dateKey, index) => {
          const dayAppointments = grouped.get(dateKey) ?? [];

          return (
            <Card key={dateKey} className={cn(dateKey === today && "ring-foreground/20 ring-2")}>
              <CardContent className="space-y-2 py-3">
                <Link
                  href={`/admin/agenda?vista=dia&fecha=${dateKey}`}
                  className="flex items-baseline gap-2 hover:underline"
                >
                  <span className="text-sm font-medium">{WEEKDAY_SHORT[index]}</span>
                  <span className="text-muted-foreground text-sm tabular-nums">
                    {dayNumber(dateKey)}
                  </span>
                </Link>

                {dayAppointments.length === 0 ? (
                  <p className="text-muted-foreground text-xs">Sin turnos</p>
                ) : (
                  <div className="space-y-1">
                    {dayAppointments.map((appointment) => (
                      <EventChip key={appointment.id} appointment={appointment} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </>
  );
}

export function MonthView({
  days,
  monthKey,
  dateKey,
  appointments,
}: {
  days: string[];
  monthKey: string;
  dateKey: string;
  appointments: AppointmentWithCustomer[];
}) {
  const grouped = groupByDay(appointments);
  const today = todayKey();

  return (
    <>
      <MonthMobileView
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

        {days.map((dateKey) => {
          const dayAppointments = grouped.get(dateKey) ?? [];
          const inMonth = isSameMonth(dateKey, `${monthKey}-01`);

          return (
            <Link
              key={dateKey}
              href={`/admin/agenda?vista=dia&fecha=${dateKey}`}
              className={cn(
                "bg-background hover:bg-accent min-h-24 space-y-1 p-1.5 transition-colors",
                !inMonth && "bg-muted/40",
              )}
            >
              <span
                className={cn(
                  "inline-flex size-6 items-center justify-center rounded-full text-xs tabular-nums",
                  !inMonth && "text-muted-foreground",
                  dateKey === today && "bg-foreground text-background font-medium",
                )}
              >
                {dayNumber(dateKey)}
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
