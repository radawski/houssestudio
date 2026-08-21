import Image from "next/image";
import { ArrowDown } from "lucide-react";

import { BUSINESS_NAME } from "@/lib/config";

/**
 * Portada a pantalla completa.
 *
 * Sobre el negro se apilan tres capas decorativas —resplandor, grilla y logo—
 * definidas en `app/globals.css` (`.hs-hero-*`). Van marcadas como
 * `aria-hidden`: no aportan información, y anunciarlas solo ensuciaría la
 * lectura del lector de pantalla antes de llegar al contenido real.
 *
 * El CTA es un ancla y no una navegación: el stepper vive en la misma página,
 * así que bajar hasta él no descarta nada de lo que el visitante ya eligió.
 */
export function SiteHero({ tagline }: { tagline?: string }) {
  return (
    <section className="relative flex min-h-dvh flex-col overflow-hidden bg-[#050505] text-white">
      <div className="hs-hero-glow" aria-hidden />
      <div className="hs-hero-grid" aria-hidden />
      <Image
        src="/logo.png"
        alt=""
        width={914}
        height={1024}
        priority
        aria-hidden
        className="hs-hero-logo"
      />

      {/* Columna angosta y centrada, como en el diseño de referencia: el fondo
          ocupa toda la pantalla, el texto no. */}
      <div className="relative mx-auto flex w-full max-w-[430px] flex-1 flex-col px-7 pt-[76px] pb-12">
        <p className="text-[12px] tracking-[0.28em] text-white/55 uppercase">Peluquería</p>

        <div className="mt-11">
          {/* "HOUSSESTUDIO" es una sola palabra y no puede partirse: a 44px
              fijos se recortaba en pantallas de 320px, más angostas que el
              diseño de referencia. El clamp lo achica solo por debajo de ~400px
              y mantiene los 44px del diseño de ahí en adelante. */}
          <h1 className="text-[clamp(2rem,calc(12.6vw-6px),44px)] leading-[1.05] font-medium tracking-[0.02em]">
            {BUSINESS_NAME}
          </h1>
          <p className="mt-[18px] max-w-[280px] text-base leading-[1.5] text-white/60">
            {tagline ?? "Turnos online, sin llamadas y sin seña."}
          </p>
        </div>

        <div className="flex-1" />

        <a
          href="#reservar"
          className="group inline-flex w-fit items-center gap-2.5 border border-white/35 px-[22px] py-4 text-[13px] tracking-[0.18em] uppercase transition-colors hover:border-white/60 hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:outline-none"
        >
          Reservar turno
          <ArrowDown className="size-4 transition-transform group-hover:translate-y-0.5" />
        </a>
      </div>
    </section>
  );
}
