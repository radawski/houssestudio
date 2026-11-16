"use client";

import { useEffect, useRef, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

import { cn } from "@/lib/utils";

/** Distancia (ya amortiguada) a partir de la cual soltar actualiza. */
const THRESHOLD = 72;
/** Lo más que baja el indicador aunque el dedo siga. */
const MAX_PULL = 120;
/** Al volver a la app después de este tiempo en segundo plano, se actualiza sola. */
const STALE_AFTER_MS = 60_000;

/**
 * En iOS, una app agregada a la pantalla de inicio (modo standalone) no tiene
 * la interfaz de Safari y con ella pierde el "deslizar hacia abajo para
 * actualizar". Esto lo reemplaza solo en ese modo; en el navegador normal se
 * deja el gesto nativo. En desarrollo, `?ptr` en la URL lo fuerza para probar.
 */
function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  if (process.env.NODE_ENV !== "production" && new URLSearchParams(window.location.search).has("ptr")) {
    return true;
  }
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/** Algún contenedor entre el dedo y `main` tiene scroll propio y no está arriba de todo. */
function insideScrolledChild(target: EventTarget | null, root: HTMLElement): boolean {
  let el = target instanceof Element ? target : null;
  while (el && el !== root) {
    if (el instanceof HTMLElement && el.scrollTop > 0) return true;
    el = el.parentElement;
  }
  return false;
}

/**
 * El `<main>` del panel con "deslizar para actualizar" propio. El que scrollea
 * en el celular es `main` (el shell ocupa el viewport), así que el gesto se
 * mide sobre él; en desktop `main` no scrollea y el gesto no se activa.
 *
 * No desplaza el contenido: dentro de `main` hay FAB `fixed` que un
 * `transform` en un ancestro arrastraría. Un indicador baja desde el header.
 *
 * Actualizar es `router.refresh()`: pide los datos de nuevo al servidor sin
 * recargar la página ni perder el estado de los componentes del cliente.
 */
export function PullToRefreshMain({ className, children }: { className?: string; children: ReactNode }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const mainRef = useRef<HTMLElement>(null);
  const indicatorRef = useRef<HTMLDivElement>(null);
  const iconRef = useRef<HTMLDivElement>(null);
  const refreshingRef = useRef(false);

  // Mueve el indicador sin pasar por React: corre en cada `touchmove`.
  const paint = (pull: number, animate: boolean) => {
    const ind = indicatorRef.current;
    const icon = iconRef.current;
    if (!ind || !icon) return;
    const progress = Math.min(pull / THRESHOLD, 1);
    ind.style.transition = animate ? "transform 200ms ease-out, opacity 200ms ease-out" : "none";
    ind.style.transform = `translate(-50%, ${pull - 48}px)`;
    ind.style.opacity = pull > 0 ? String(Math.max(progress, 0.3)) : "0";
    if (!refreshingRef.current) icon.style.transform = `rotate(${progress * 270}deg)`;
  };

  // Termina la actualización cuando llegan los datos nuevos.
  useEffect(() => {
    if (!isPending && refreshingRef.current) {
      refreshingRef.current = false;
      paint(0, true);
    }
  }, [isPending]);

  useEffect(() => {
    const main = mainRef.current;
    if (!main || !isStandalone()) return;

    let startY: number | null = null;
    let pull = 0;
    let engaged = false;

    const refresh = () => {
      refreshingRef.current = true;
      paint(THRESHOLD * 0.75, true);
      startTransition(() => router.refresh());
    };

    const onStart = (e: TouchEvent) => {
      startY = null;
      if (refreshingRef.current || e.touches.length !== 1) return;
      // Solo cuando `main` es el que scrollea (celular) y está arriba de todo.
      if (getComputedStyle(main).overflowY !== "auto" || main.scrollTop > 0) return;
      if (insideScrolledChild(e.target, main)) return;
      startY = e.touches[0].clientY;
      pull = 0;
      engaged = false;
    };

    const onMove = (e: TouchEvent) => {
      if (startY === null) return;
      const dy = e.touches[0].clientY - startY;
      if (!engaged) {
        // Primero hacia arriba: es un scroll normal, no un tirón.
        if (dy <= 0 || main.scrollTop > 0) {
          startY = null;
          return;
        }
        engaged = true;
      }
      // Se toma el gesto: sin esto iOS hace el rebote propio de `main`.
      e.preventDefault();
      // Resistencia creciente, como el nativo.
      pull = Math.min(MAX_PULL, Math.max(0, dy) * 0.5);
      paint(pull, false);
    };

    const onEnd = () => {
      if (startY === null || !engaged) {
        startY = null;
        return;
      }
      startY = null;
      if (pull >= THRESHOLD) refresh();
      else paint(0, true);
    };

    // Al volver a la app tras un rato, los turnos pueden haber cambiado.
    let hiddenAt: number | null = null;
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        hiddenAt = Date.now();
      } else if (hiddenAt !== null && Date.now() - hiddenAt > STALE_AFTER_MS) {
        hiddenAt = null;
        startTransition(() => router.refresh());
      }
    };

    main.addEventListener("touchstart", onStart, { passive: true });
    // `passive: false` porque `onMove` llama a `preventDefault` al tomar el gesto.
    main.addEventListener("touchmove", onMove, { passive: false });
    main.addEventListener("touchend", onEnd);
    main.addEventListener("touchcancel", onEnd);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      main.removeEventListener("touchstart", onStart);
      main.removeEventListener("touchmove", onMove);
      main.removeEventListener("touchend", onEnd);
      main.removeEventListener("touchcancel", onEnd);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [router]);

  return (
    <main ref={mainRef} className={className}>
      {/* `sticky` y de alto cero: queda pegado arriba de `main` aunque haya scroll. */}
      <div className="pointer-events-none sticky top-0 z-30 h-0 md:hidden" aria-hidden={!isPending}>
        <div
          ref={indicatorRef}
          className="bg-popover absolute left-1/2 flex size-10 items-center justify-center rounded-full border shadow-md"
          style={{ transform: "translate(-50%, -48px)", opacity: 0 }}
        >
          {/* El giro es funcional (indica carga), no decorativo: se mantiene
              aunque el sistema pida reducir movimiento, igual que el nativo. */}
          <div ref={iconRef} className={cn(isPending && "animate-spin")}>
            <RefreshCw className="text-foreground size-5" />
          </div>
        </div>
        <span className="sr-only" role="status">
          {isPending ? "Actualizando" : ""}
        </span>
      </div>
      {children}
    </main>
  );
}
