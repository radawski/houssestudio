"use client";

import { formatCurrency, formatDuration } from "@/lib/format";
import type { Service } from "@/lib/supabase/database.types";

/** Marcador de lo que todavía no se eligió. */
const PLACEHOLDER = "—";

function Row({ label, value }: { label: string; value: string | null }) {
  const isEmpty = value === null;

  return (
    <div className="flex items-baseline justify-between gap-4 py-3">
      <dt className="text-muted-foreground text-xs tracking-[0.08em] uppercase">{label}</dt>
      <dd
        className={isEmpty ? "text-muted-foreground" : "text-foreground text-right"}
        aria-label={isEmpty ? `${label}: sin elegir` : undefined}
      >
        {value ?? PLACEHOLDER}
      </dd>
    </div>
  );
}

/**
 * Resumen que se completa a medida que avanza la reserva.
 *
 * Los campos vacíos se muestran con un guion en vez de ocultarse: así el
 * visitante ve desde el primer paso cuánta información se le va a pedir y el
 * panel no cambia de alto al llenarse.
 */
export function BookingSummary({
  service,
  dateLabel,
  timeLabel,
}: {
  service: Service | null;
  dateLabel: string | null;
  timeLabel: string | null;
}) {
  return (
    <aside className="border-border bg-[var(--hs-surface-raised)] border p-6">
      <p className="text-muted-foreground text-xs tracking-[var(--hs-tracking-wide)] uppercase">
        Tu reserva
      </p>

      <dl className="divide-border mt-4 divide-y">
        <Row label="Servicio" value={service?.name ?? null} />
        <Row
          label="Duración"
          value={service ? formatDuration(service.duration_minutes) : null}
        />
        <Row label="Fecha" value={dateLabel} />
        <Row label="Horario" value={timeLabel} />
      </dl>

      <div className="border-border mt-4 flex items-baseline justify-between border-t pt-4">
        <span className="text-xs tracking-[0.08em] uppercase">Total</span>
        <span className="text-xl font-light tabular-nums">
          {service ? formatCurrency(service.price) : PLACEHOLDER}
        </span>
      </div>

      <p className="text-muted-foreground mt-4 text-xs">
        No se pide seña ni pago por adelantado.
      </p>
    </aside>
  );
}
