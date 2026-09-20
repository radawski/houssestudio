import { IdCard, Mail, Phone, StickyNote } from "lucide-react";

import {
  CancelAppointmentButton,
  ConfirmAppointmentButton,
  ConfirmedAppointmentActions,
} from "@/components/admin/appointment-actions";
import { AppointmentSheet } from "@/components/admin/appointment-sheet";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
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

  const content = (
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
          {/* `<a>` solo cuando la tarjeta no es ella misma un <button> (ver
              más abajo): un enlace dentro de un botón es HTML inválido y
              rompe el árbol de accesibilidad. */}
          {isOpen ? (
            <a href={`tel:${customer.phone}`} className="hover:text-foreground flex items-center gap-1.5">
              <Phone className="size-3.5" />
              {customer.phone}
            </a>
          ) : (
            <span className="flex items-center gap-1.5">
              <Phone className="size-3.5" />
              {customer.phone}
            </span>
          )}
          {customer.email ? (
            isOpen ? (
              <a
                href={`mailto:${customer.email}`}
                className="hover:text-foreground flex items-center gap-1.5"
              >
                <Mail className="size-3.5" />
                {customer.email}
              </a>
            ) : (
              <span className="flex items-center gap-1.5">
                <Mail className="size-3.5" />
                {customer.email}
              </span>
            )
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
            <ConfirmedAppointmentActions
              id={appointment.id}
              suggestedAmount={appointment.price_at_booking}
              clientName={customer?.full_name ?? "Cliente eliminado"}
              serviceName={appointment.service_name_at_booking}
              startsAt={appointment.starts_at}
              phone={customer?.phone}
              email={customer?.email}
              showMarkNoShow={canMarkNoShow({ status, startsAt: appointment.starts_at })}
            />
          ) : null}
          <CancelAppointmentButton
            id={appointment.id}
            label={status === "pendiente" ? "Rechazar" : "Cancelar"}
          />
        </div>
      ) : null}
    </CardContent>
  );

  // Completado, cancelado y ausente no tienen fila de acciones: tocar la
  // tarjeta abre la ficha (design/admin-iphone n-SheetTurno). El trigger es
  // un <button> real (no un <div role="button">) para que el foco y la
  // activación por teclado vengan gratis de la semántica nativa.
  if (!isOpen) {
    return (
      <Dialog>
        <DialogTrigger asChild>
          <button type="button" className="block w-full text-left">
            <Card className="hover:bg-accent transition-colors">{content}</Card>
          </button>
        </DialogTrigger>
        <AppointmentSheet appointment={appointment} />
      </Dialog>
    );
  }

  return <Card>{content}</Card>;
}
