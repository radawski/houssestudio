"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import { trackNavigation, type NavTrack } from "@/lib/mas-return";

/**
 * Lo anota el panel en memoria (vive mientras dure la página: alcanza, porque
 * las navegaciones del panel no la recargan).
 */
let track: NavTrack = { current: null, previous: null, viaPop: false };
/** Hubo un "atrás"/"adelante" del historial y todavía no llegó su ruta. */
let popPending = false;

export function getNavTrack(): NavTrack {
  return track;
}

/**
 * Anota cada navegación del panel: la URL anterior y si a la actual se llegó
 * con el historial (`popstate`, que el navegador dispara antes de que el
 * router cambie de ruta). Lo usa el ← de las pantallas de Más para saber si
 * puede volver con `router.back()` (`lib/mas-return.ts`). No dibuja nada.
 */
export function NavigationTracker() {
  const pathname = usePathname();
  const search = useSearchParams().toString();

  useEffect(() => {
    // El router de Next escucha `popstate` antes que este componente y puede
    // haber cambiado de ruta (y corrido el efecto de abajo) antes de que
    // llegue acá. Si la ruta nueva ya está anotada, se la marca ahora como
    // llegada con el historial; si todavía no, queda pendiente para cuando
    // llegue. Así no depende del orden de los listeners.
    const onPop = () => {
      if (track.current === `${window.location.pathname}${window.location.search}`) {
        track = { ...track, viaPop: true };
      } else {
        popPending = true;
      }
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    track = trackNavigation(track, search ? `${pathname}?${search}` : pathname, popPending);
    popPending = false;
  }, [pathname, search]);

  return null;
}
