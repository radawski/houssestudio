"use client";

import Link from "next/link";
import { IdCard, Mail, Phone, StickyNote, Wallet } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { buildAppointmentTimeline } from "@/lib/appointment-timeline";
import type { AppointmentWithCustomer } from "@/lib/data/appointments";
import { formatCurrency, formatDateTime, formatDuration, formatLongDate, formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Badge monocromático propio de la ficha (design/admin-iphone n-SheetTurno /
 * n-SheetTurnoCancelado): deliberadamente NO reusa `STATUS_META` de
 * `lib/status.ts`, que también pinta el badge del portal público — ese
 * archivo queda fuera del alcance de este rediseño (es solo el panel admin).
 */
const SHEET_BADGE: Record<
  "confirmado" | "completado" | "cancelado" | "no_show",
  { label: string; badge: string; dot: string }
> = {
  confirmado: {
    label: "Confirmado",
    badge: "border-[var(--hs-mist)] bg-popover text-foreground",
    dot: "bg-foreground",
  },
  completado: {
    label: "Completado",
    badge: "border-[var(--hs-mist)] bg-popover text-muted-foreground",
    dot: "bg-muted-foreground",
  },
  cancelado: {
    label: "Cancelado",
    badge: "border-[var(--hs-border-card)] bg-background text-muted-foreground",
    dot: "bg-[var(--hs-mist)]",
  },
  no_show: {
    label: "No asistió",
    badge: "border-[var(--hs-border-card)] bg-background text-muted-foreground",
    dot: "bg-[var(--hs-mist)]",
  },
};

function ClientRow({
  icon: Icon,
  value,
  action,
  href,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  value: string;
  action?: string;
  href?: string;
}) {
  const content = (
    <>
      <Icon className="text-muted-foreground size-4 shrink-0" strokeWidth={1.75} />
      <span className="flex-1 truncate text-sm tabular-nums">{value}</span>
      <span className="text-muted-foreground text-xs">{action}</span>
    </>
  );

  const rowClass = "border-t border-[var(--hs-divider)] flex min-h-12 items-center gap-3 px-3.5";

  if (href) {
    return (
      <a href={href} className={rowClass}>
        {content}
      </a>
    );
  }
  return <div className={rowClass}>{content}</div>;
}

/**
 * Ficha del turno: se abre tocando una tarjeta completada, cancelada o
 * ausente (design/admin-iphone n-SheetTurno / n-SheetTurnoCancelado). Un
 * turno pendiente o confirmado no la usa — esos siguen resolviéndose con la
 * fila de acciones de `AppointmentCard`.
 */
export function AppointmentSheet({ appointment }: { appointment: AppointmentWithCustomer }) {
  const { customer, status } = appointment;
  const badge = SHEET_BADGE[status as keyof typeof SHEET_BADGE] ?? SHEET_BADGE.completado;
  const timeline = buildAppointmentTimeline(appointment);

  return (
    <DialogContent showCloseButton={false} className="sm:max-w-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <DialogDescription className="text-xs">
            {formatLongDate(appointment.starts_at)}
          </DialogDescription>
          <DialogTitle asChild>
            <h2 className="mt-0.5 text-lg font-semibold tabular-nums">
              {formatTime(appointment.starts_at)} – {formatTime(appointment.ends_at)}
            </h2>
          </DialogTitle>
        </div>
        <span
          className={cn(
            "inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium",
            badge.badge,
          )}
        >
          <span className={cn("size-1.5 rounded-full", badge.dot)} />
          {badge.label}
        </span>
      </div>

      <p className="text-muted-foreground text-sm tabular-nums">
        {appointment.service_name_at_booking} ·{" "}
        {formatDuration(appointment.duration_minutes_at_booking)} ·{" "}
        {formatCurrency(appointment.price_at_booking)}
      </p>

      {customer ? (
        <div className="overflow-hidden rounded-md border border-[var(--hs-border-card)]">
          <p className="px-3.5 py-3 text-sm font-semibold">{customer.full_name}</p>
          <ClientRow icon={IdCard} value={formatDni(customer.dni)} action="DNI" />
          <ClientRow icon={Phone} value={customer.phone} action="Llamar" href={`tel:${customer.phone}`} />
          {customer.email ? (
            <ClientRow icon={Mail} value={customer.email} action="Escribir" href={`mailto:${customer.email}`} />
          ) : null}
        </div>
      ) : null}

      {appointment.customer_note ? (
        <p className="text-muted-foreground flex gap-2 text-sm leading-snug">
          <StickyNote className="mt-0.5 size-4 shrink-0" strokeWidth={1.75} />
          Nota del cliente: {appointment.customer_note}
        </p>
      ) : null}

      {status === "completado" && appointment.payment ? (
        <div className="flex items-center gap-3 rounded-md border border-[var(--hs-border-card)] p-3.5">
          <Wallet className="text-muted-foreground size-[18px] shrink-0" strokeWidth={1.75} />
          <div className="flex-1">
            <p className="text-muted-foreground text-[10px] font-medium tracking-[0.08em] uppercase">
              Cobrado
            </p>
            <p className="mt-0.5 text-[15px] font-semibold tabular-nums">
              {formatCurrency(appointment.payment.amount)} ·{" "}
              {appointment.payment.method === "efectivo" ? "Efectivo" : "Transferencia"}
            </p>
          </div>
          <span className="text-muted-foreground text-xs tabular-nums">
            {formatTime(appointment.payment.paid_at)}
          </span>
        </div>
      ) : null}

      {status === "cancelado" && appointment.cancellation_reason ? (
        <div className="rounded-md border border-[var(--hs-border-card)] bg-background p-3.5">
          <p className="text-muted-foreground text-[10px] font-medium tracking-[0.08em] uppercase">
            Motivo
          </p>
          <p className="mt-0.5 text-sm leading-snug">{appointment.cancellation_reason}</p>
        </div>
      ) : null}

      <div className="flex flex-col gap-2.5">
        <h3 className="text-muted-foreground text-[11px] font-medium tracking-[0.12em] uppercase">
          Historial
        </h3>
        <div className="flex flex-col">
          {timeline.map((step, index) => (
            <div key={step.label} className="flex gap-2.5">
              <div className="flex w-[9px] shrink-0 flex-col items-center">
                <span
                  className={cn(
                    "mt-1 size-[9px] rounded-full",
                    index === timeline.length - 1 ? "bg-foreground" : "bg-[var(--hs-mist)]",
                  )}
                />
                {index < timeline.length - 1 ? (
                  <span className="w-px flex-1 bg-[var(--hs-border-card)]" />
                ) : null}
              </div>
              <div className={index < timeline.length - 1 ? "pb-3.5" : ""}>
                <p className="text-sm font-medium">{step.label}</p>
                <p className="text-muted-foreground mt-0.5 text-xs tabular-nums">
                  {formatDateTime(step.at)} · {step.author}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {status === "completado" ? (
          <Button asChild variant="outline" size="touch">
            <Link href="/admin/caja">Ver el movimiento en caja</Link>
          </Button>
        ) : status === "cancelado" ? (
          <Button asChild variant="outline" size="touch">
            <Link href="/admin/agenda">Ver el horario libre en la agenda</Link>
          </Button>
        ) : null}
        <DialogClose asChild>
          <Button variant="ghost" size="touch-lg">
            Cerrar
          </Button>
        </DialogClose>
      </div>
    </DialogContent>
  );
}

/** DNI con puntos de miles, mismo criterio de lectura que un documento impreso. */
function formatDni(dni: string): string {
  return dni.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}
