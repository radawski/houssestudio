"use client";

import { ArrowDown } from "lucide-react";

import { useHideHero } from "@/components/public/booking-landing";

const TARGET_ID = "reservar";

/** Cuánto tiempo sin eventos `scroll` cuenta como fin del desplazamiento. */
const SCROLL_IDLE_MS = 150;

/**
 * Llama a `onEnd` una sola vez cuando el desplazamiento de la ventana se
 * detiene. Usa `scrollend` donde existe; donde no (Safari anterior al 26),
 * espera `SCROLL_IDLE_MS` sin eventos `scroll`. El temporizador arranca de
 * entrada, así que también termina si el destino ya estaba a la vista y no
 * hubo nada que desplazar.
 */
function onScrollEnd(onEnd: () => void) {
  let timer: ReturnType<typeof setTimeout>;
  const finish = () => {
    clearTimeout(timer);
    window.removeEventListener("scroll", restart);
    window.removeEventListener("scrollend", finish);
    onEnd();
  };
  const restart = () => {
    clearTimeout(timer);
    timer = setTimeout(finish, SCROLL_IDLE_MS);
  };

  if ("onscrollend" in window) window.addEventListener("scrollend", finish);
  window.addEventListener("scroll", restart, { passive: true });
  restart();
}

/**
 * CTA de la portada: baja hasta el stepper con un desplazamiento suave y,
 * al llegar, retira la portada (`BookingLanding`).
 *
 * El descenso se resuelve acá y no con `scroll-behavior: smooth` sobre `html`
 * porque esa propiedad es global y alcanza también a los saltos que hace el
 * router: al enviar la reserva, Next lleva la página nueva al tope con un
 * `scrollTo`, y con el modo suave activado ese salto instantáneo se
 * convertiría en una animación de subida que no pidió nadie. Acotarlo al
 * botón deja el resto de la navegación como está.
 *
 * El desplazamiento es suave aunque el sistema pida menos movimiento
 * (decisión del negocio): es corto y lo inicia el propio visitante. Las
 * animaciones decorativas en bucle de la portada sí respetan ese ajuste.
 *
 * Sigue siendo un `<a href="#reservar">` real: si el JavaScript todavía no
 * hidrató, o directamente falla, el enlace funciona igual con el salto nativo
 * del navegador (y la portada queda en su lugar). El comportamiento suave es
 * una mejora encima, no un requisito.
 */
export function HeroCta() {
  const hideHero = useHideHero();

  function handleClick(event: React.MouseEvent<HTMLAnchorElement>) {
    // Respeta los modificadores del navegador (abrir en pestaña nueva, etc.).
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    const target = document.getElementById(TARGET_ID);
    if (!target) return;

    event.preventDefault();
    target.scrollIntoView({ behavior: "smooth", block: "start" });

    // Al cancelar el salto nativo también se cancela el traslado del foco, que
    // es lo que usa quien navega con teclado para seguir desde el destino.
    // `preventScroll` evita que enfocar la sección la traiga de un tirón y
    // arruine la animación recién iniciada. La sección no se desmonta al
    // retirar la portada, así que el foco sigue ahí después.
    target.focus({ preventScroll: true });

    // Mantiene la URL compartible sin sumar una entrada al historial: el botón
    // es un atajo dentro de la misma página, no un paso al que haga falta
    // volver con el botón "atrás".
    history.replaceState(null, "", `#${TARGET_ID}`);

    // Solo se retira la portada si el desplazamiento llegó: si el visitante lo
    // interrumpió con el dedo, se la deja para no moverle la página.
    onScrollEnd(() => {
      if (Math.abs(target.getBoundingClientRect().top) <= 2) hideHero?.();
    });
  }

  return (
    <a
      href={`#${TARGET_ID}`}
      onClick={handleClick}
      className="hs-cta group inline-flex w-fit items-center gap-2.5 border border-white/35 px-[22px] py-4 text-[13px] tracking-[0.18em] uppercase hover:border-white/60 hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:outline-none"
    >
      Reservar turno
      <ArrowDown className="hs-cta-arrow size-4" />
    </a>
  );
}
