import { ArrowDown } from "lucide-react";

import { BUSINESS_NAME } from "@/lib/config";

/**
 * Portada a pantalla completa.
 *
 * El CTA es un ancla y no una navegación: el stepper vive en la misma página,
 * así que bajar hasta él no descarta nada de lo que el visitante ya eligió.
 */
export function SiteHero({ tagline }: { tagline?: string }) {
  return (
    <section className="bg-[var(--hs-ink)] text-[var(--hs-paper)] flex min-h-dvh flex-col justify-between px-6 py-10 sm:px-10">
      <p className="text-[var(--hs-mist)] text-xs tracking-[var(--hs-tracking-wide)] uppercase">
        Peluquería
      </p>

      <div className="max-w-4xl">
        {/* Tamaño fluido: el nombre es largo y con saltos fijos se cortaba en
            los anchos intermedios. El clamp lo hace escalar con el viewport. */}
        <h1 className="text-[clamp(2.75rem,11vw,8rem)] leading-[0.95] font-light tracking-[var(--hs-tracking-tight)] break-words">
          {BUSINESS_NAME}
        </h1>
        <p className="text-[var(--hs-mist)] mt-6 max-w-md text-base font-light sm:text-lg">
          {tagline ?? "Turnos online, sin llamadas y sin seña."}
        </p>
      </div>

      <a
        href="#reservar"
        className="border-[var(--hs-slate)] text-[var(--hs-paper)] hover:bg-[var(--hs-graphite)] focus-visible:ring-[var(--hs-mist)] group inline-flex w-fit items-center gap-3 border px-6 py-3 text-sm tracking-[0.08em] uppercase transition-colors focus-visible:ring-2 focus-visible:outline-none"
      >
        Reservar turno
        <ArrowDown className="size-4 transition-transform group-hover:translate-y-0.5" />
      </a>
    </section>
  );
}
