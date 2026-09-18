import { IdCard, Mail, Phone, StickyNote } from "lucide-react";

import {
  CancelAppointmentButton,
  CompleteAppointmentButton,
  ConfirmAppointmentButton,
  MarkNoShowButton,
} from "@/components/admin/appointment-actions";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { canMarkNoShow } from "@/lib/appointment-rules";
import type { AppointmentWithCustomer } from "@/lib/data/appointments";
import { formatCurrency, formatLongDate, formatTime } from "@/lib/format";

/**
 * Ficha de un turno con los datos que el barbero necesita para decidir.
 *
 * El telefono y el email son enlaces: desde el celular, el camino natural para
 * resolver una duda antes de aceptar un turno es tocar el numero y escribir.
 */
export function AppointmentCard({
  appointment,
  showDate = false,
}: {
  appointment: AppointmentWithCustomer;
  showDate?: boolean;
}) {
  const { customer, status } = appointment;
  const isOpen = status === "pendiente" || status === "confirmado";

  return (
    <Card>
      <CardContent className="space-y-3 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-medium tabular-nums">
              {showDate ? (
                <span className="first-letter:uppercase">
                  {formatLongDate(appointment.starts_at)},{" "}
                </span>
              ) : null}
              {formatTime(appointment.starts_at)} – {formatTime(appointment.ends_at)}
            </p>
            <p className="text-muted-foreground truncate text-sm">
              {customer?.full_name ?? "Cliente eliminado"} ·{" "}
              {appointment.service_name_at_booking} ·{" "}
              <span className="tabular-nums">
                {formatCurrency(appointment.price_at_booking)}
              </span>
            </p>
          </div>
          <StatusBadge status={status} />
        </div>

        {customer ? (
          <div className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-sm">
            <span className="flex items-center gap-1.5">
              <IdCard className="size-3.5" />
              {customer.dni}
            </span>
            <a href={`tel:${customer.phone}`} className="hover:text-foreground flex items-center gap-1.5">
              <Phone className="size-3.5" />
              {customer.phone}
            </a>
            {customer.email ? (
              <a
                href={`mailto:${customer.email}`}
                className="hover:text-foreground flex items-center gap-1.5"
              >
                <Mail className="size-3.5" />
                {customer.email}
              </a>
            ) : null}
          </div>
        ) : null}

        {appointment.customer_note ? (
          <p className="text-muted-foreground flex gap-1.5 text-sm">
            <StickyNote className="mt-0.5 size-3.5 shrink-0" />
            {appointment.customer_note}
          </p>
        ) : null}

        {appointment.cancellation_reason ? (
          <p className="text-muted-foreground text-sm">
            Motivo: {appointment.cancellation_reason}
          </p>
        ) : null}

        {isOpen ? (
          <div className="flex flex-wrap gap-2 pt-1">
            {status === "pendiente" ? <ConfirmAppointmentButton id={appointment.id} /> : null}
            {status === "confirmado" ? (
              <>
                <CompleteAppointmentButton
                  id={appointment.id}
                  suggestedAmount={appointment.price_at_booking}
                />
                {canMarkNoShow({ status, startsAt: appointment.starts_at }) ? (
                  <MarkNoShowButton id={appointment.id} />
                ) : null}
              </>
            ) : null}
            <CancelAppointmentButton
              id={appointment.id}
              label={status === "pendiente" ? "Rechazar" : "Cancelar"}
            />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
