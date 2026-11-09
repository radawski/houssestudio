import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";

import { CustomerNotes, EditCustomerSheet } from "@/app/admin/clientes/[id]/customer-edit";
import { AppointmentSheet } from "@/components/admin/appointment-sheet";
import { BackHeader } from "@/components/admin/back-header";
import { AdminStatusBadge } from "@/components/admin/status-badge";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { describePayment, splitFromColumns } from "@/lib/cashbox";
import { initials } from "@/lib/customer-summary";
import { getCustomerDetail, type CustomerHistoryItem } from "@/lib/data/customers";
import { formatCurrency, formatDni, formatInTz, formatTime } from "@/lib/format";
import type { Customer } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Ficha de cliente" };

const LABEL = "text-muted-foreground text-[10px] font-medium tracking-[0.08em] uppercase";

function Stat({ label, value, alert = false }: { label: string; value: string; alert?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-md border px-3 py-2.5",
        alert ? "border-[#f3c9c4] bg-[#fdeeec] text-[#9a2a22]" : "bg-card border-[var(--hs-border-card)]",
      )}
    >
      <p className={cn(LABEL, alert && "text-[#9a2a22]")}>{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function DataRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-3 border-b border-[var(--hs-divider)] text-sm last:border-b-0">
      <span className="text-muted-foreground text-[13px]">{label}</span>
      <span className="min-w-0 truncate text-right">{children}</span>
    </div>
  );
}

/**
 * Ficha de un cliente (plan de noviembre, C1): datos, notas privadas,
 * contadores e historial completo. Cada turno del historial abre su hoja, con
 * las mismas acciones que desde la Agenda.
 */
export default async function CustomerPage({ params }: PageProps<"/admin/clientes/[id]">) {
  const { id } = await params;
  const detail = await getCustomerDetail(id);
  if (!detail) notFound();

  const { customer, summary, appointments } = detail;

  return (
    <div className="space-y-4">
      <BackHeader title="Clientes" href="/admin/clientes" backLabel="Volver a Clientes" />

      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="bg-card text-muted-foreground flex size-13 shrink-0 items-center justify-center rounded-full border border-[var(--hs-border-card)] text-[17px] font-semibold"
        >
          {initials(customer.full_name)}
        </span>
        <div className="min-w-0">
          <h2 className="truncate text-[21px] font-semibold tracking-[-0.02em]">{customer.full_name}</h2>
          <p className="text-muted-foreground text-[13px] first-letter:uppercase">
            Cliente desde {formatInTz(customer.created_at, "MMMM yyyy")}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Stat label="Visitas" value={String(summary.visits)} />
        <Stat label="No vino" value={String(summary.noShows)} alert={summary.noShows > 0} />
        <Stat label="Canceló" value={String(summary.cancellations)} />
        <Stat label="Gastado" value={formatCurrency(summary.spent)} />
      </div>

      <section className="bg-card rounded-md border border-[var(--hs-border-card)] px-3.5 pt-1 pb-3">
        <DataRow label="DNI">
          <span className="tabular-nums">{formatDni(customer.dni)}</span>
        </DataRow>
        <DataRow label="Teléfono">
          <a href={`tel:${customer.phone}`} className="font-medium tabular-nums">
            {customer.phone}
          </a>
        </DataRow>
        <DataRow label="Email">
          {customer.email ? (
            <a href={`mailto:${customer.email}`} className="font-medium">
              {customer.email}
            </a>
          ) : (
            <span className="text-muted-foreground">Sin email</span>
          )}
        </DataRow>
        <div className="mt-2 flex gap-2">
          <EditCustomerSheet customer={customer} />
        </div>
      </section>

      <CustomerNotes id={customer.id} initial={customer.notes ?? ""} />

      <section className="space-y-2">
        <h3 className="text-muted-foreground text-[11px] font-medium tracking-[0.12em] uppercase">
          Historial · {appointments.length} {appointments.length === 1 ? "turno" : "turnos"}
        </h3>
        {appointments.length === 0 ? (
          <p className="bg-card text-muted-foreground rounded-md border border-[var(--hs-border-card)] px-4 py-6 text-center text-sm">
            Todavía no sacó ningún turno.
          </p>
        ) : (
          <ul className="bg-card divide-y divide-[var(--hs-divider)] overflow-hidden rounded-md border border-[var(--hs-border-card)]">
            {appointments.map((appointment) => (
              <li key={appointment.id}>
                <HistoryRow appointment={appointment} customer={customer} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function HistoryRow({ appointment, customer }: { appointment: CustomerHistoryItem; customer: Customer }) {
  const detail = [
    appointment.service_name_at_booking,
    appointment.payment
      ? `${formatCurrency(appointment.payment.amount)} · ${describePayment(
          {
            amount: appointment.payment.amount,
            method: appointment.payment.method,
            split: splitFromColumns(appointment.payment.cash_amount, appointment.payment.transfer_amount),
          },
          formatCurrency,
        ).toLowerCase()}`
      : appointment.status === "cancelado" && appointment.cancellation_reason
        ? `“${appointment.cancellation_reason}”`
        : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button type="button" className="hover:bg-accent flex min-h-16 w-full items-center gap-3 px-3.5 py-3 text-left">
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold tabular-nums">
              {formatInTz(appointment.starts_at, "EEE d/M")} · {formatTime(appointment.starts_at)}
            </span>
            <span className="text-muted-foreground block truncate text-[13px]">{detail}</span>
          </span>
          <AdminStatusBadge status={appointment.status} />
          <ChevronRight className="text-muted-foreground size-4 shrink-0" aria-hidden />
        </button>
      </DialogTrigger>
      <AppointmentSheet
        appointment={{
          ...appointment,
          customer: {
            id: customer.id,
            dni: customer.dni,
            full_name: customer.full_name,
            phone: customer.phone,
            email: customer.email,
          },
        }}
      />
    </Dialog>
  );
}
