import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Check } from "lucide-react";

import { CancelAppointmentButton } from "@/components/public/cancel-appointment-button";
import { StatusBadge } from "@/components/status-badge";
import { cancelAffordance } from "@/lib/cancellation";
import { BUSINESS_NAME } from "@/lib/config";
import { getSettings } from "@/lib/data/availability";
import { getAppointmentByToken } from "@/lib/data/public";
import { formatCurrency, formatLongDate, formatTime } from "@/lib/format";

export const metadata: Metadata = { title: "Tu turno" };

export const dynamic = "force-dynamic";

const STATUS_MESSAGE: Record<string, string> = {
  pendiente:
    "Recibimos tu solicitud. Te vamos a escribir por email en cuanto quede confirmada.",
  confirmado: "Tu turno está confirmado. ¡Te esperamos!",
  completado: "Este turno ya fue realizado. ¡Gracias por venir!",
  cancelado: "Este turno fue cancelado.",
  no_show: "Este turno figura como ausente.",
};

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-border flex items-baseline justify-between gap-4 border-t py-3">
      <dt className="text-muted-foreground text-xs tracking-[0.08em] uppercase">{label}</dt>
      <dd className="text-right">{value}</dd>
    </div>
  );
}

/**
 * Pantalla dedicada, no un modal: es el comprobante del cliente y tiene que
 * poder guardarse, compartirse y volver a abrirse desde su propia URL.
 */
export default async function AppointmentPage({
  params,
  searchParams,
}: PageProps<"/turno/[token]">) {
  const { token } = await params;
  const { nuevo } = await searchParams;

  const appointment = await getAppointmentByToken(token);
  if (!appointment) notFound();

  const settings = await getSettings();
  const affordance = cancelAffordance({
    status: appointment.status,
    startsAt: appointment.starts_at,
    windowHours: settings.cancellation_window_hours,
  });

  return (
    <main className="flex min-h-dvh flex-1 flex-col px-6 py-10 sm:px-10">
      <Link
        href="/"
        className="text-xs tracking-[var(--hs-tracking-wide)] uppercase"
      >
        {BUSINESS_NAME}
      </Link>

      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center py-12">
        {nuevo ? (
          <div className="mb-10">
            <span className="border-foreground mb-6 flex size-12 items-center justify-center border">
              <Check className="size-5" />
            </span>
            <h1 className="text-3xl font-light tracking-[var(--hs-tracking-tight)] sm:text-4xl">
              Turno solicitado
            </h1>
            <p className="text-muted-foreground mt-3 text-sm">
              Guardá esta página: desde acá vas a poder seguir el estado de tu turno.
            </p>
          </div>
        ) : (
          <h1 className="mb-10 text-3xl font-light tracking-[var(--hs-tracking-tight)] sm:text-4xl">
            Tu turno
          </h1>
        )}

        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-2xl font-light first-letter:uppercase">
              {formatLongDate(appointment.starts_at)}
            </p>
            <p className="text-muted-foreground mt-1 tabular-nums">
              {formatTime(appointment.starts_at)} – {formatTime(appointment.ends_at)} h
            </p>
          </div>
          <StatusBadge status={appointment.status} />
        </div>

        <dl className="border-border border-b">
          <DetailRow label="Servicio" value={appointment.service_name_at_booking} />
          <DetailRow
            label="Precio"
            value={formatCurrency(appointment.price_at_booking)}
          />
          <DetailRow
            label="A nombre de"
            value={appointment.customer?.full_name ?? "—"}
          />
        </dl>

        <p className="text-muted-foreground mt-6 text-sm">
          {STATUS_MESSAGE[appointment.status]}
        </p>

        {appointment.cancellation_reason ? (
          <p className="text-muted-foreground mt-2 text-sm">
            Motivo: {appointment.cancellation_reason}
          </p>
        ) : null}

        {affordance !== "ninguna" ? (
          <div className="mt-6">
            <CancelAppointmentButton
              token={token}
              businessWhatsapp={settings.phone}
              withinWindow={affordance === "boton"}
            />
          </div>
        ) : null}
      </div>
    </main>
  );
}
