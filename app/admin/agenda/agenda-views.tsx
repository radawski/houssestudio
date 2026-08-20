import Link from "next/link";

import { AppointmentCard } from "@/components/admin/appointment-card";
import { Card, CardContent } from "@/components/ui/card";
import type { AppointmentWithCustomer } from "@/lib/data/appointments";
import { isSameMonth, toDateKey, todayKey } from "@/lib/dates";
import { formatTime } from "@/lib/format";
import { STATUS_META } from "@/lib/status";
import { cn } from "@/lib/utils";

/** Agrupa por dia local del local, que es como se lee una agenda. */
export function groupByDay(
  appointments: AppointmentWithCustomer[],
): Map<string, AppointmentWithCustomer[]> {
  const grouped = new Map<string, AppointmentWithCustomer[]>();
  for (const appointment of appointments) {
    const key = toDateKey(new Date(appointment.starts_at));
    const bucket = grouped.get(key);
    if (bucket) bucket.push(appointment);
    else grouped.set(key, [appointment]);
  }
  return grouped;
}

const WEEKDAY_SHORT = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"] as const;

const dayNumber = (dateKey: string) => Number(dateKey.slice(8, 10));

function EmptyDay({ label = "Sin turnos." }: { label?: string }) {
  return (
    <Card>
      <CardContent className="text-muted-foreground py-10 text-center text-sm">
        {label}
      </CardContent>
    </Card>
  );
}

export function DayView({ appointments }: { appointments: AppointmentWithCustomer[] }) {
  if (appointments.length === 0) return <EmptyDay />;

  return (
    <div className="grid gap-3">
      {appointments.map((appointment) => (
        <AppointmentCard key={appointment.id} appointment={appointment} />
      ))}
    </div>
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
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
  );
}

export function MonthView({
  days,
  monthKey,
  appointments,
}: {
  days: string[];
  monthKey: string;
  appointments: AppointmentWithCustomer[];
}) {
  const grouped = groupByDay(appointments);
  const today = todayKey();

  return (
    <div className="overflow-x-auto">
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
  );
}
