import Link from "next/link";

import { AdminStatusBadge } from "@/components/admin/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { dayNumber, groupByDay, WEEKDAY_SHORT } from "@/lib/agenda-day";
import type { AppointmentWithCustomer } from "@/lib/data/appointments";
import { todayKey } from "@/lib/dates";
import { formatTime } from "@/lib/format";
import { STATUS_META } from "@/lib/status";
import { cn } from "@/lib/utils";

/** Chip compacto usado en las vistas de semana y mes. */
export function EventChip({ appointment }: { appointment: AppointmentWithCustomer }) {
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

/**
 * Vista semana. Con `appointments = null` es su propio esqueleto (diseño
 * "Estados de carga", n-AgendaVistaSemana): los días son reales porque se
 * calculan sin pedir nada, y donde van los turnos queda una barra de 38 px.
 * Al llegar los datos cada barra pasa a ser tarjetas o "Sin turnos", sin
 * mover el resto.
 *
 * Vive aparte de `DayView` porque no depende de componentes de servidor: la
 * usa también el esqueleto, que se arma en el navegador.
 */
export function WeekView({
  days,
  appointments,
}: {
  days: string[];
  appointments: AppointmentWithCustomer[] | null;
}) {
  const grouped = appointments ? groupByDay(appointments) : null;
  const today = todayKey();

  return (
    <>
      {/* Lista vertical por dia (design/admin-iphone n-AgendaSemana): a 390px la
          grilla de 7 columnas del escritorio queda en 50px por columna, un
          modelo de interaccion distinto que no vale la pena forzar a un solo
          componente. */}
      <div className="flex flex-col md:hidden">
        {days.map((dateKey, index) => {
          const dayAppointments = grouped?.get(dateKey) ?? [];
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

              {!grouped ? (
                <Skeleton className="h-[38px] flex-1 rounded-md" />
              ) : dayAppointments.length === 0 ? (
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
          const dayAppointments = grouped?.get(dateKey) ?? [];

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

                {!grouped ? (
                  <div className="flex h-4 items-center">
                    <Skeleton className="h-3 w-24" />
                  </div>
                ) : dayAppointments.length === 0 ? (
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
