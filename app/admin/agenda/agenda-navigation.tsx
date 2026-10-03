"use client";

import {
  createContext,
  startTransition,
  useContext,
  useEffect,
  useOptimistic,
  useReducer,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import { agendaHref, type AgendaView } from "@/lib/agenda-nav";
import {
  holdReducer,
  showSkeleton,
  SKELETON_DELAY_MS,
  SKELETON_MIN_MS,
} from "@/lib/loading-hold";

type AgendaPosition = { view: AgendaView; dateKey: string };

/** Qué control disparó la navegación en curso (◀ queda marcado mientras carga). */
export type AgendaControl = "prev" | "next" | "today" | "strip";

type AgendaNavigationValue = AgendaPosition & {
  /** Hay una navegación en curso: lo que muestra el servidor no es lo pedido. */
  loading: boolean;
  /** La lista va a esqueleto (con la demora y el mínimo de `lib/loading-hold`). */
  skeleton: boolean;
  pressed: AgendaControl | null;
  navigate: (to: AgendaPosition, control: AgendaControl) => void;
};

const AgendaNavigationContext = createContext<AgendaNavigationValue | null>(null);

export function useAgendaNavigation(): AgendaNavigationValue {
  const value = useContext(AgendaNavigationContext);
  if (!value) throw new Error("useAgendaNavigation va dentro de <AgendaNavigation>.");
  return value;
}

/**
 * Navegación de la Agenda sin esperar al servidor (L1,
 * tasks/plan-mejoras-octubre.md).
 *
 * La página del servidor sigue trayendo todo antes de responder; mientras
 * tanto `useOptimistic` guarda la vista y la fecha recién tocadas. Con eso el
 * toolbar (título, tira, flechas) salta al toque, y la lista muestra el
 * esqueleto mientras lo pedido no coincida con lo que trajo el servidor. Esa
 * comparación también cubre los toques seguidos: ▶ ▶ ▶ avanza desde la fecha
 * ya avanzada, y una respuesta vieja que llegue en el medio no se pinta.
 */
export function AgendaNavigation({
  view,
  dateKey,
  children,
}: AgendaPosition & { children: React.ReactNode }) {
  const router = useRouter();
  const [position, setPosition] = useOptimistic<AgendaPosition>({ view, dateKey });
  const [phase, dispatch] = useReducer(holdReducer, "idle");
  const [pressed, setPressed] = useState<AgendaControl | null>(null);

  const loading = position.view !== view || position.dateKey !== dateKey;

  // Los temporizadores leen si la carga sigue en curso al vencer, no cuando
  // se crearon.
  const loadingRef = useRef(loading);
  useEffect(() => {
    loadingRef.current = loading;
  });

  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  function navigate(to: AgendaPosition, control: AgendaControl) {
    timers.current.forEach(clearTimeout);
    dispatch({ type: "start" });
    setPressed(control);
    timers.current = [
      setTimeout(() => dispatch({ type: "delayElapsed", loading: loadingRef.current }), SKELETON_DELAY_MS),
      setTimeout(() => dispatch({ type: "minElapsed" }), SKELETON_DELAY_MS + SKELETON_MIN_MS),
    ];
    startTransition(() => {
      setPosition(to);
      router.push(agendaHref(to.view, to.dateKey));
    });
  }

  return (
    <AgendaNavigationContext.Provider
      value={{
        ...position,
        loading,
        skeleton: showSkeleton(loading, phase),
        pressed: loading ? pressed : null,
        navigate,
      }}
    >
      {children}
    </AgendaNavigationContext.Provider>
  );
}

/**
 * La lista de la vista: el contenido del servidor, o el esqueleto mientras
 * carga. El esqueleto se monta al tocar y `.hs-reveal-delayed` lo deja
 * invisible los primeros 200 ms.
 */
export function AgendaBody({ skeleton, children }: { skeleton: React.ReactNode; children: React.ReactNode }) {
  const navigation = useAgendaNavigation();
  return navigation.skeleton ? <div className="hs-reveal-delayed">{skeleton}</div> : <>{children}</>;
}
