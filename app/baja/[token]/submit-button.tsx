"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="bg-foreground text-background hover:bg-[var(--hs-graphite)] focus-visible:ring-ring inline-flex min-h-11 items-center px-6 py-3 text-sm tracking-[0.08em] uppercase transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:opacity-60"
    >
      {pending ? "Guardando…" : "Dejar de recibir recordatorios"}
    </button>
  );
}
