"use client";

import { useSyncExternalStore } from "react";
import { X } from "lucide-react";
import { Popover as PopoverPrimitive } from "radix-ui";

import { useHeroElement } from "@/components/public/booking-landing";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { BUSINESS_NAME } from "@/lib/config";
import { heroIsUnder } from "@/lib/hero-scroll";
import { cn } from "@/lib/utils";

/** Centro del botón respecto del borde inferior: `bottom-6` (24) + la mitad de 56. */
const FAB_CENTER_FROM_BOTTOM_PX = 52;

/** Globo de WhatsApp dibujado en trazo, como el resto de los íconos del sitio. */
function WhatsappIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        d="M4.2 19.8l1.1-3.6A8.2 8.2 0 1 1 8.1 18.9z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path
        d="M9.1 8.4c.2-.4.5-.5.8-.5h.4c.2 0 .4.1.5.3l.7 1.6c.1.2 0 .4-.1.6l-.5.6c-.1.1-.1.3 0 .4.6 1 1.4 1.8 2.4 2.4.1.1.3.1.4 0l.6-.5c.2-.2.4-.2.6-.1l1.6.7c.2.1.3.3.3.5v.4c0 .3-.1.6-.5.8-.6.4-1.4.5-2.2.3-1.4-.4-2.7-1.3-3.7-2.3s-1.9-2.3-2.3-3.7c-.2-.8-.1-1.5.3-1.9z"
        fill="currentColor"
      />
    </svg>
  );
}

function subscribeToViewport(onChange: () => void) {
  window.addEventListener("scroll", onChange, { passive: true });
  window.addEventListener("resize", onChange);
  return () => {
    window.removeEventListener("scroll", onChange);
    window.removeEventListener("resize", onChange);
  };
}

/**
 * El botón va en blanco mientras la portada (negra) está detrás de él. En el
 * servidor la portada siempre está: la página arranca arriba de todo.
 */
function useOverHero(): boolean {
  const hero = useHeroElement();
  return useSyncExternalStore(
    subscribeToViewport,
    () =>
      hero !== null &&
      heroIsUnder(hero.getBoundingClientRect().bottom, window.innerHeight, FAB_CENTER_FROM_BOTTOM_PX),
    () => true,
  );
}

/**
 * Botón flotante de WhatsApp de la reserva (diseño "Botón WhatsApp
 * HOUSSESTUDIO"): abre una tarjeta con el acceso a la conversación en vez de
 * saltar directo a la app, para que un toque accidental mientras se elige un
 * horario no saque al visitante de la página.
 *
 * Sin animaciones de entrada ni de presión: el celular de prueba tiene
 * "Reducir movimiento", y el cambio de escala al presionar es instantáneo.
 * Al abrir no se enfoca nada adentro (igual que las hojas del panel).
 */
export function WhatsappFab({ href }: { href: string }) {
  const overHero = useOverHero();

  return (
    <Popover>
      <PopoverTrigger
        aria-label="Escribinos por WhatsApp"
        className={cn(
          "fixed right-5 bottom-[calc(1.5rem+env(safe-area-inset-bottom))] z-40 flex size-14 items-center justify-center rounded-[4px] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[var(--hs-slate)] active:scale-[0.96]",
          overHero
            ? "bg-white text-[var(--hs-ink)] hover:bg-[var(--hs-paper)]"
            : "bg-[var(--hs-ink)] text-[var(--hs-paper)] hover:bg-[var(--hs-graphite)]",
        )}
      >
        <WhatsappIcon className="size-9" />
      </PopoverTrigger>

      <PopoverContent
        side="top"
        align="end"
        sideOffset={12}
        aria-label="Contacto por WhatsApp"
        onOpenAutoFocus={(event) => event.preventDefault()}
        className="w-[280px] gap-4 rounded-[4px] border border-[var(--hs-border-card)] bg-white p-5 text-[var(--hs-ink)] shadow-none ring-0 data-closed:animate-none data-open:animate-none"
      >
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-bold tracking-[var(--hs-tracking-wide)]">{BUSINESS_NAME}</span>
          <PopoverPrimitive.Close
            aria-label="Cerrar"
            className="-my-3 -mr-3 flex size-11 items-center justify-center text-[var(--hs-slate)] hover:text-[var(--hs-ink)] focus-visible:ring-2 focus-visible:ring-[var(--hs-slate)] focus-visible:outline-none"
          >
            <X className="size-[18px]" strokeWidth={1.75} />
          </PopoverPrimitive.Close>
        </div>
        <p className="text-[15px] leading-normal">
          ¿Dudas con tu turno? Escribinos y te respondemos por WhatsApp.
        </p>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-foreground text-background hover:bg-[var(--hs-graphite)] focus-visible:ring-ring flex h-12 items-center justify-center gap-2.5 text-sm tracking-[0.08em] uppercase transition-colors focus-visible:ring-2 focus-visible:outline-none"
        >
          <WhatsappIcon className="size-[18px]" />
          Abrir WhatsApp
        </a>
      </PopoverContent>
    </Popover>
  );
}

