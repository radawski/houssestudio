"use client";

import { cn } from "@/lib/utils";

export type Slot = { startsAt: string; label: string };

/**
 * Horarios disponibles del día elegido.
 *
 * Los estados vacío y cargando son distintos a propósito: "no quedan horarios"
 * es información útil que invita a probar otra fecha, mientras que un vacío
 * mientras carga se leería como que el día está completo.
 */
export function TimeSlotGrid({
  slots,
  loading,
  selected,
  onSelect,
  serviceName,
  dateLabel,
}: {
  slots: Slot[] | null;
  loading: boolean;
  selected: Slot | null;
  onSelect: (slot: Slot) => void;
  serviceName: string;
  /** Día elegido, para encabezar la grilla. */
  dateLabel?: string;
}) {
  const heading = dateLabel ? (
    <p className="mb-3 text-sm first-letter:uppercase">Horarios · {dateLabel}</p>
  ) : null;

  if (loading || slots === null) {
    return (
      <div>
        {heading}
        <p className="text-muted-foreground py-8 text-center text-sm">Buscando horarios…</p>
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <div>
        {heading}
        <div className="border-border bg-[var(--hs-surface-raised)] border p-6 text-center">
        <p className="text-sm">No quedan horarios libres ese día para {serviceName}.</p>
          <p className="text-muted-foreground mt-1 text-sm">Probá con otra fecha.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {heading}
      <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
      {slots.map((slot) => {
        const isSelected = selected?.startsAt === slot.startsAt;

        return (
          <button
            key={slot.startsAt}
            type="button"
            onClick={() => onSelect(slot)}
            aria-pressed={isSelected}
            className={cn(
              "focus-visible:ring-ring border py-3 text-sm tabular-nums transition-colors focus-visible:ring-2 focus-visible:outline-none",
              isSelected
                ? "border-foreground bg-foreground text-background"
                : "border-border hover:bg-accent",
            )}
          >
            {slot.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
