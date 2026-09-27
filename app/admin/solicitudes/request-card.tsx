import { IdCard, Phone } from "lucide-react";

import {
  CancelAppointmentButton,
  ConfirmAppointmentButton,
} from "@/components/admin/appointment-actions";
import { AdminStatusBadge } from "@/components/admin/status-badge";
import type { AppointmentWithCustomer } from "@/lib/data/appointments";
import { formatCurrency, formatDni, formatLongDate, formatTime } from "@/lib/format";

const CHIP =
  "inline-flex h-[30px] items-center gap-1.5 rounded-full border border-[var(--hs-border-card)] px-3 text-xs text-muted-foreground tabular-nums";

/**
 * Tarjeta de una solicitud pendiente en el celular (design/admin-iphone
 * n-Solicitudes). Es propia y no una variante de `AppointmentCard` porque
 * cambia casi todo: fecha larga arriba, chips de DNI y teléfono, y solo dos
 * acciones. En escritorio la página sigue usando `AppointmentCard`.
 *
 * El teléfono es un `<a href="tel:">`: antes de aceptar, el camino natural
 * desde el celular es tocar el número. Rechazar nunca cancela directo, abre
 * la hoja con el motivo; el rojo aparece recién ahí.
 */
export function RequestCard({ appointment }: { appointment: AppointmentWithCustomer }) {
  const { customer } = appointment;

  return (
    <div className="bg-card space-y-3 rounded-md border border-[var(--hs-border-card)] p-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-muted-foreground text-[13px] first-letter:uppercase">
            {formatLongDate(appointment.starts_at)}
          </p>
          <p className="text-base font-semibold tabular-nums">
            {formatTime(appointment.starts_at)} – {formatTime(appointment.ends_at)}
          </p>
        </div>
        <AdminStatusBadge status={appointment.status} />
      </div>

      <div>
        <p className="text-[15px] font-medium">{customer?.full_name ?? "Cliente eliminado"}</p>
        <p className="text-muted-foreground text-[13px] tabular-nums">
          {appointment.service_name_at_booking} · {formatCurrency(appointment.price_at_booking)}
        </p>
      </div>

      {customer ? (
        <div className="flex flex-wrap gap-2">
          <span className={CHIP}>
            <IdCard className="size-3.5" />
            DNI {formatDni(customer.dni)}
          </span>
          <a href={`tel:${customer.phone}`} className={CHIP}>
            <Phone className="size-3.5" />
            {customer.phone}
          </a>
        </div>
      ) : null}

      {appointment.customer_note ? (
        <p className="text-muted-foreground text-[13px]">Nota: {appointment.customer_note}</p>
      ) : null}

      <div className="flex gap-2">
        <ConfirmAppointmentButton id={appointment.id} />
        <CancelAppointmentButton
          id={appointment.id}
          label="Rechazar"
          clientName={customer?.full_name ?? "Cliente eliminado"}
          startsAt={appointment.starts_at}
        />
      </div>
    </div>
  );
}
