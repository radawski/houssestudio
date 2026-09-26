"use client";

import { createContext, useContext, useLayoutEffect, useState } from "react";

const HideHeroContext = createContext<(() => void) | null>(null);

/** Oculta la portada. Fuera de `BookingLanding` devuelve `null`. */
export function useHideHero() {
  return useContext(HideHeroContext);
}

/**
 * Envuelve portada y stepper para poder retirar la portada una vez que el
 * visitante tocó "Reservar turno" y el desplazamiento suave llegó al stepper.
 * No hay vuelta atrás: recargar la página la trae de nuevo.
 *
 * La portada llega como prop (`hero`) y no se importa acá porque es un
 * componente de servidor; así sigue renderizándose en el servidor aunque este
 * contenedor corra en el cliente.
 *
 * Al desmontarla, todo lo que estaba debajo sube lo que medía la portada. En
 * el mismo commit, antes de pintar, se lleva el scroll a 0: el stepper queda
 * exactamente donde estaba en pantalla y no se ve ningún salto. Es un
 * `scrollTo` instantáneo porque `html` no tiene `scroll-behavior: smooth`
 * (ver `hero-cta.tsx`).
 */
export function BookingLanding({
  hero,
  children,
}: {
  hero: React.ReactNode;
  children: React.ReactNode;
}) {
  const [heroHidden, setHeroHidden] = useState(false);

  useLayoutEffect(() => {
    if (heroHidden) window.scrollTo(0, 0);
  }, [heroHidden]);

  return (
    <HideHeroContext.Provider value={() => setHeroHidden(true)}>
      {heroHidden ? null : hero}
      {children}
    </HideHeroContext.Provider>
  );
}
