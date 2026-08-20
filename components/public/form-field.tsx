"use client";

import type { ReactNode } from "react";

/**
 * Envoltorio compartido por todos los campos del formulario público: la
 * etiqueta, el input y su error van siempre en el mismo layout. Vive aparte
 * para que `DniGate` y `BookingFields` — que ya no comparten un único
 * `<form>` visual, sino que uno se despliega adentro del otro — se vean como
 * el mismo formulario.
 */
export function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label
        htmlFor={id}
        className="text-muted-foreground block text-xs tracking-[0.08em] uppercase"
      >
        {label}
      </label>
      {children}
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
    </div>
  );
}

export const inputClass =
  "border-border focus:border-foreground focus-visible:ring-ring w-full border bg-transparent px-4 py-3 text-base transition-colors focus-visible:ring-2 focus-visible:outline-none";
