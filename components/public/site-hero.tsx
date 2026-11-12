import { Anton } from "next/font/google";
import Image from "next/image";
import Link from "next/link";

import { HeroCta } from "@/components/public/hero-cta";
import { BUSINESS_NAME } from "@/lib/config";

/**
 * Tipografía de marca, solo para el nombre del local en la portada. Se carga
 * acá y no en el layout raíz: así la bajan únicamente las páginas que muestran
 * la portada, y el resto del sitio y el panel siguen solo con Roboto.
 */
export const anton = Anton({ weight: "400", subsets: ["latin"] });

/**
 * Portada a pantalla completa.
 *
 * Sobre el negro se apilan tres capas decorativas —resplandor, grilla y logo—
 * definidas en `app/globals.css` (`.hs-hero-*`). Van marcadas como
 * `aria-hidden`: no aportan información, y anunciarlas solo ensuciaría la
 * lectura del lector de pantalla antes de llegar al contenido real.
 *
 * El CTA es un ancla y no una navegación: el stepper vive en la misma página,
 * así que bajar hasta él no descarta nada de lo que el visitante ya eligió. El
 * descenso suave lo maneja `HeroCta`, que por eso es el único trozo de la
 * portada que corre en el cliente.
 */
export function SiteHero({ tagline }: { tagline?: string }) {
  return (
    <section className="relative flex min-h-dvh flex-col overflow-hidden bg-[#050505] text-white">
      <div className="hs-hero-glow" aria-hidden />
      <div className="hs-hero-grid" aria-hidden />
      {/* Es el elemento LCP de la portada: se pide de entrada y con prioridad
          alta. `sizes` repite el ancho de `.hs-hero-logo` (min(520px, 62vw):
          62vw hasta los ~839px, 520px de ahí en adelante) para que el
          navegador no baje la variante pensada para todo el viewport. */}
      <Image
        src="/logo.png"
        alt=""
        width={914}
        height={1024}
        loading="eager"
        fetchPriority="high"
        sizes="(min-width: 839px) 520px, 62vw"
        aria-hidden
        className="hs-hero-logo"
      />

      {/* Columna angosta y centrada, como en el diseño de referencia: el fondo
          ocupa toda la pantalla, el texto no. */}
      <div className="relative mx-auto flex w-full max-w-[430px] flex-1 flex-col px-7 pt-[76px] pb-12">
        <p className="text-[12px] tracking-[0.28em] text-white/55 uppercase">Barbería</p>

        <div className="mt-11">
          {/* "HOUSSESTUDIO" es una sola palabra y no puede partirse. En Anton
              (angosta) entra a 56px en el ancho del diseño; el clamp la achica
              solo en pantallas más angostas, como las de 320px. */}
          <h1
            className={`${anton.className} text-[clamp(2.5rem,calc(17vw-6px),56px)] leading-[1.05] font-normal uppercase`}
          >
            {BUSINESS_NAME}
          </h1>
          <p className="mt-[18px] max-w-[280px] text-base leading-[1.5] text-white/60">
            {tagline ?? "Turnos online, sin llamadas y sin seña."}
          </p>
        </div>

        <div className="flex-1" />

        <div className="flex flex-col items-start gap-3">
          <HeroCta />
          {/* Para quien ya reservó: ver el estado o cancelar sin buscar el
              mail. Más tenue que el CTA, que sigue siendo la acción principal. */}
          <Link
            href="/mis-turnos"
            className="inline-flex w-fit items-center gap-2.5 border border-white/20 px-[22px] py-4 text-[13px] tracking-[0.18em] text-white/80 uppercase hover:border-white/45 hover:text-white focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:outline-none"
          >
            Mis turnos
          </Link>
          {/* En el celular el botón flotante de WhatsApp queda a esta altura:
              el relleno derecho hace que el texto corte antes de meterse abajo. */}
          <p className="pr-14 text-[13px] text-white/50 sm:pr-0">Mirá el estado de tu turno o cancelalo.</p>
        </div>
      </div>
    </section>
  );
}
