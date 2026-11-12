"use client";

import { Check } from "lucide-react";

import { formatCurrency, formatDuration } from "@/lib/format";
import type { Service } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";

/**
 * Servicio seleccionable.
 *
 * Elegir no avanza de paso: marca la opción y habilita "Continuar". Separar
 * selección de navegación permite cambiar de idea sin ir y volver.
 */
export function ServiceOption({
  service,
  selected,
  onSelect,
}: {
  service: Service;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "focus-visible:ring-ring w-full border p-5 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none",
        selected ? "border-foreground bg-[var(--hs-surface-raised)]" : "border-border hover:bg-accent",
      )}
    >
      <div className="flex items-baseline justify-between gap-4">
        {/* La tilde va en línea con el texto: si el nombre ocupa dos renglones
            queda al final de la última palabra y no flotando en el medio. */}
        <span className="text-lg font-light">
          {service.name}
          {selected ? <Check className="ml-2 inline size-4 align-[-2px]" /> : null}
        </span>
        <span className="tabular-nums">{formatCurrency(service.price)}</span>
      </div>

      {service.description ? (
        <p className="text-muted-foreground mt-2 text-sm">{service.description}</p>
      ) : null}

      <p className="text-muted-foreground mt-3 text-xs tracking-[0.08em] uppercase">
        {formatDuration(service.duration_minutes)}
      </p>
    </button>
  );
}
