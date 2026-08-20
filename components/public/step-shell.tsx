"use client";

import type { ReactNode } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";

/**
 * Marco común de cada paso: título, contenido y navegación.
 *
 * El contenido scrollea dentro de su propia caja en vez de estirar la página,
 * de modo que el indicador de progreso y los botones queden siempre a la vista
 * aunque un día tenga muchos horarios libres.
 */
export function StepShell({
  title,
  hint,
  children,
  onBack,
  onContinue,
  continueLabel = "Continuar",
  canContinue = true,
  /**
   * El último paso envía un formulario, así que su botón tiene que ser un
   * `submit` real dentro del `<form>` y no un handler de click.
   */
  continueType = "button",
}: {
  title: string;
  hint?: string;
  children: ReactNode;
  onBack?: () => void;
  onContinue?: () => void;
  continueLabel?: string;
  canContinue?: boolean;
  continueType?: "button" | "submit";
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="mb-6">
        <h2 className="text-2xl font-light tracking-[var(--hs-tracking-tight)] sm:text-3xl">
          {title}
        </h2>
        {hint ? <p className="text-muted-foreground mt-2 text-sm">{hint}</p> : null}
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto pr-1">{children}</div>

      <footer className="border-border mt-6 flex items-center justify-between gap-4 border-t pt-6">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex items-center gap-2 text-sm tracking-[0.08em] uppercase transition-colors focus-visible:ring-2 focus-visible:outline-none"
          >
            <ArrowLeft className="size-4" />
            Volver
          </button>
        ) : (
          <span />
        )}

        <button
            type={continueType}
            onClick={onContinue}
            disabled={!canContinue}
            className="bg-foreground text-background hover:bg-[var(--hs-graphite)] focus-visible:ring-ring inline-flex items-center gap-2 px-6 py-3 text-sm tracking-[0.08em] uppercase transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-30"
          >
            {continueLabel}
            <ArrowRight className="size-4" />
          </button>
      </footer>
    </div>
  );
}
