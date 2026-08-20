"use client";

import { cn } from "@/lib/utils";

export const STEP_LABELS = ["Servicio", "Fecha y horario", "Tus datos"] as const;

export type StepNumber = 1 | 2 | 3;

/**
 * Progreso numerado, siempre visible mientras dura la reserva.
 *
 * Los pasos ya recorridos quedan marcados pero no son clickeables: volver se
 * hace con el botón "Volver", de modo que haya un solo camino hacia atrás y el
 * estado no pueda quedar inconsistente.
 */
export function StepIndicator({ current }: { current: StepNumber }) {
  return (
    <ol className="flex items-center gap-3 sm:gap-5" aria-label="Progreso de la reserva">
      {STEP_LABELS.map((label, index) => {
        const position = (index + 1) as StepNumber;
        const isCurrent = position === current;
        const isDone = position < current;

        return (
          <li key={label} className="flex items-center gap-3 sm:gap-5">
            <span
              className="flex items-center gap-2"
              aria-current={isCurrent ? "step" : undefined}
            >
              <span
                className={cn(
                  "flex size-7 items-center justify-center border text-xs tabular-nums transition-colors",
                  isCurrent && "border-foreground bg-foreground text-background",
                  isDone && "border-foreground text-foreground",
                  !isCurrent && !isDone && "border-border text-muted-foreground",
                )}
              >
                {position}
              </span>
              <span
                className={cn(
                  "hidden text-xs tracking-[0.08em] uppercase sm:inline",
                  isCurrent ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {label}
              </span>
            </span>

            {position < STEP_LABELS.length ? (
              <span className="bg-border h-px w-6 sm:w-10" aria-hidden />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
