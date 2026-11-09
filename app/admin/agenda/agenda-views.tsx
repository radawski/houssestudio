import { AppointmentCard } from "@/components/admin/appointment-card";
import { AppointmentSheet } from "@/components/admin/appointment-sheet";
import { CustomerHistoryChip } from "@/components/admin/customer-history-chip";
import { AdminStatusBadge } from "@/components/admin/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { buildAgendaDayRows } from "@/lib/agenda-day";
import type { Interval } from "@/lib/availability";
import type { AppointmentWithCustomer } from "@/lib/data/appointments";
import { formatCurrency, formatTime } from "@/lib/format";
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
      <span className="w-11 shrink-0 pt-0.5 text-right text-[13px] font-semibold text-[var(--hs-green)] tabular-nums">
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
  const cancelled = appointment.status === "cancelado";
  const open = appointment.status === "pendiente" || appointment.status === "confirmado";

  return (
    <div className="flex gap-2.5">
      <span
        className={cn(
          "w-11 shrink-0 pt-0.5 text-right text-[13px] font-semibold tabular-nums",
          cancelled ? "text-muted-foreground font-medium line-through" : "text-[var(--hs-green)]",
        )}
      >
        {formatTime(appointment.starts_at)}
      </span>
      <Dialog>
        <DialogTrigger asChild>
          <button
            type="button"
            className={cn(
              "min-w-0 flex-1 rounded-md border border-[var(--hs-border-card)] p-3 text-left",
              // Cancelado: sin el filete verde y apagado, para que no se lea
              // como un turno que sigue en pie.
              cancelled ? "bg-background" : "bg-card border-l-[3px] border-l-[var(--hs-green-soft)]",
            )}
          >
            <div className="flex items-start justify-between gap-2.5">
              <p className={cn("text-sm font-semibold tabular-nums", cancelled && "text-muted-foreground line-through")}>
                {formatTime(appointment.starts_at)} – {formatTime(appointment.ends_at)}
              </p>
              <AdminStatusBadge status={appointment.status} />
            </div>
            <p className={cn("mt-1.5 text-sm font-medium", cancelled && "text-muted-foreground line-through")}>
              {appointment.customer?.full_name ?? "Cliente eliminado"}
            </p>
            {cancelled ? (
              <p className="text-muted-foreground mt-0.5 text-xs">{cancellationLine(appointment)}</p>
            ) : (
              <p className="text-muted-foreground mt-0.5 text-xs tabular-nums">
                {appointment.service_name_at_booking} · {formatCurrency(appointment.price_at_booking)}
              </p>
            )}
            {open ? <CustomerHistoryChip history={appointment.history} className="mt-2" /> : null}
          </button>
        </DialogTrigger>
        <AppointmentSheet appointment={appointment} />
      </Dialog>
    </div>
  );
}

/** "Canceló el cliente · “Me surgió un viaje”" o "Lo cancelaste vos". */
function cancellationLine(appointment: AppointmentWithCustomer): string {
  const who = appointment.cancelled_by === "barbero" ? "Lo cancelaste vos" : "Canceló el cliente";
  return appointment.cancellation_reason ? `${who} · “${appointment.cancellation_reason}”` : who;
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
