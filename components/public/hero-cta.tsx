"use client";

import { ArrowDown } from "lucide-react";

const TARGET_ID = "reservar";

/**
 * CTA de la portada: baja hasta el stepper con un desplazamiento suave.
 *
 * El descenso se resuelve acá y no con `scroll-behavior: smooth` sobre `html`
 * porque esa propiedad es global y alcanza también a los saltos que hace el
 * router: al enviar la reserva, Next lleva la página nueva al tope con un
 * `scrollTo`, y con el modo suave activado ese salto instantáneo se
 * convertiría en una animación de subida que no pidió nadie. Acotarlo al
 * botón deja el resto de la navegación como está.
 *
 * Sigue siendo un `<a href="#reservar">` real: si el JavaScript todavía no
 * hidrató, o directamente falla, el enlace funciona igual con el salto nativo
 * del navegador. El comportamiento suave es una mejora encima, no un requisito.
 */
export function HeroCta() {
  function handleClick(event: React.MouseEvent<HTMLAnchorElement>) {
    // Respeta los modificadores del navegador (abrir en pestaña nueva, etc.).
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    const target = document.getElementById(TARGET_ID);
    if (!target) return;

    // Se consulta en el momento del clic y no al renderizar: así no hay
    // discrepancia de hidratación y se respeta el cambio de preferencia en
    // caliente. Si pidió menos movimiento, se deja el salto nativo.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    event.preventDefault();
    target.scrollIntoView({ behavior: "smooth", block: "start" });

    // Al cancelar el salto nativo también se cancela el traslado del foco, que
    // es lo que usa quien navega con teclado para seguir desde el destino.
    // `preventScroll` evita que enfocar la sección la traiga de un tirón y
    // arruine la animación recién iniciada.
    target.focus({ preventScroll: true });

    // Mantiene la URL compartible sin sumar una entrada al historial: el botón
    // es un atajo dentro de la misma página, no un paso al que haga falta
    // volver con el botón "atrás".
    history.replaceState(null, "", `#${TARGET_ID}`);
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
