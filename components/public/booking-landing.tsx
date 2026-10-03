"use client";

import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from "react";

import { heroIsBehind, scrollAfterHeroRemoval } from "@/lib/hero-scroll";

const HideHeroContext = createContext<(() => void) | null>(null);

/**
 * La portada mientras está montada (`null` una vez retirada). La usa el botón
 * de WhatsApp para saber si tiene el negro o el papel detrás.
 */
const HeroElementContext = createContext<HTMLElement | null>(null);

/** Cuánto tiempo sin eventos `scroll` cuenta como fin del desplazamiento. */
const SCROLL_IDLE_MS = 150;

/** Oculta la portada. Fuera de `BookingLanding` devuelve `null`. */
export function useHideHero() {
  return useContext(HideHeroContext);
}

export function useHeroElement() {
  return useContext(HeroElementContext);
}

/**
 * Envuelve portada y stepper para retirar la portada una vez que el visitante
 * la dejó atrás, sea con "Reservar turno" (el desplazamiento suave llegó al
 * stepper, ver `hero-cta.tsx`) o bajando con el dedo. No hay vuelta atrás:
 * recargar la página la trae de nuevo.
 *
 * La portada llega como prop (`hero`) y no se importa acá porque es un
 * componente de servidor; así sigue renderizándose en el servidor aunque este
 * contenedor corra en el cliente.
 *
 * Al desmontarla, todo lo que estaba debajo sube lo que medía la portada. En
 * el mismo commit, antes de pintar, se resta esa altura al scroll: el
 * contenido queda exactamente donde estaba en pantalla y no se ve ningún
 * salto. Con el botón eso da 0 (el stepper estaba arriba de todo); con el
 * dedo, el visitante puede haber seguido bajando.
 */
export function BookingLanding({
  hero,
  children,
}: {
  hero: React.ReactNode;
  children: React.ReactNode;
}) {
  const [heroHidden, setHeroHidden] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);
  // Copia en estado del nodo de la portada: un ref no avisa a quien lo lee
  // cuando cambia, y el botón de WhatsApp necesita enterarse al retirarla.
  const [heroElement, setHeroElement] = useState<HTMLElement | null>(null);
  // Estable: un callback nuevo en cada render haría que React lo llame con
  // `null` y con el nodo otra vez, y cada llamada vuelve a renderizar.
  const attachHero = useCallback((node: HTMLDivElement | null) => {
    heroRef.current = node;
    setHeroElement(node);
  }, []);
  /** Scroll a restaurar en el commit que quita la portada. */
  const scrollTarget = useRef(0);

  const hideHero = useCallback(() => {
    const heroElement = heroRef.current;
    if (!heroElement) return;
    scrollTarget.current = scrollAfterHeroRemoval(window.scrollY, heroElement.offsetHeight);
    setHeroHidden(true);
  }, []);

  useLayoutEffect(() => {
    if (heroHidden) window.scrollTo(0, scrollTarget.current);
  }, [heroHidden]);

  // Bajar con el dedo hasta pasar la portada equivale a tocar el botón. Se
  // decide recién cuando el scroll se detiene y el dedo ya no está apoyado:
  // retirarla a mitad del gesto (o durante la inercia de iOS) le movería la
  // página al visitante mientras la está arrastrando.
  useEffect(() => {
    if (heroHidden) return;

    let timer: ReturnType<typeof setTimeout> | undefined;
    let touching = false;

    const check = () => {
      clearTimeout(timer);
      const heroElement = heroRef.current;
      if (touching || !heroElement) return;
      if (heroIsBehind(heroElement.getBoundingClientRect().bottom)) hideHero();
    };
    // Cada evento `scroll` posterga la revisión, también los de la inercia
    // que sigue después de soltar el dedo. `scrollend`, donde existe, avisa
    // antes; en Safari anterior al 26 manda el silencio de `SCROLL_IDLE_MS`.
    const restart = () => {
      clearTimeout(timer);
      timer = setTimeout(check, SCROLL_IDLE_MS);
    };
    const onTouchStart = () => {
      touching = true;
      clearTimeout(timer);
    };
    const onTouchEnd = () => {
      touching = false;
      restart();
    };

    window.addEventListener("scrollend", check);
    window.addEventListener("scroll", restart, { passive: true });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("touchcancel", onTouchEnd, { passive: true });

    return () => {
      clearTimeout(timer);
      window.removeEventListener("scrollend", check);
      window.removeEventListener("scroll", restart);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [heroHidden, hideHero]);

  return (
    <HideHeroContext.Provider value={hideHero}>
      <HeroElementContext.Provider value={heroElement}>
        {heroHidden ? null : (
          <div ref={attachHero}>
            {hero}
          </div>
        )}
        {children}
      </HeroElementContext.Provider>
    </HideHeroContext.Provider>
  );
}
