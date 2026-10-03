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

import { MonthView } from "@/app/admin/agenda/month-view";
import { WeekView } from "@/app/admin/agenda/week-view";
import { DayListSkeleton } from "@/components/admin/loading-skeletons";
import { agendaHref, type AgendaView } from "@/lib/agenda-nav";
import { monthRange, weekRange } from "@/lib/dates";
import {
  holdReducer,
  showSkeleton,
  SKELETON_DELAY_MS,
  SKELETON_MIN_MS,
} from "@/lib/loading-hold";

type AgendaPosition = { view: AgendaView; dateKey: string };

/** Qué control disparó la navegación en curso (◀ queda marcado mientras carga). */
export type AgendaControl = "prev" | "next" | "today" | "strip" | "view";

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

  const delayTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const minTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(
    () => () => {
      clearTimeout(delayTimer.current);
      clearTimeout(minTimer.current);
    },
    [],
  );

  function navigate(to: AgendaPosition, control: AgendaControl) {
    // La demora de 200 ms corre desde el primer toque, igual que la del CSS:
    // las barras quedan montadas desde ahí. Un toque más con la carga en
    // curso no la reinicia; solo corre el mínimo para que no se suelten antes.
    if (!loadingRef.current) {
      clearTimeout(delayTimer.current);
      delayTimer.current = setTimeout(
        () => dispatch({ type: "delayElapsed", loading: loadingRef.current }),
        SKELETON_DELAY_MS,
      );
    }
    clearTimeout(minTimer.current);
    minTimer.current = setTimeout(() => dispatch({ type: "minElapsed" }), SKELETON_DELAY_MS + SKELETON_MIN_MS);
    dispatch({ type: "start" });
    setPressed(control);
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

const LOADING_LABEL: Record<AgendaView, string> = {
  dia: "Cargando turnos del día…",
  semana: "Cargando turnos de la semana…",
  mes: "Cargando turnos del mes…",
};

/**
 * El cuerpo de la vista: el contenido del servidor, o el esqueleto de la
 * vista y la fecha recién tocadas mientras carga. Se arma acá, en el
 * navegador, porque al cambiar de Día a Semana el esqueleto tiene que ser el
 * de Semana aunque el servidor todavía esté mostrando Día.
 *
 * Semana y Mes son su propio esqueleto (`appointments = null`): los días y la
 * grilla se ven desde el primer cuadro y solo las barras esperan los 200 ms
 * (`.hs-reveal-bars`). En Día no hay nada que pintar sin datos y espera todo
 * el bloque (`.hs-reveal-delayed`).
 */
export function AgendaBody({ children }: { children: React.ReactNode }) {
  const { view, dateKey, skeleton } = useAgendaNavigation();
  if (!skeleton) return <>{children}</>;

  const month = view === "mes" ? monthRange(dateKey) : null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={view === "dia" ? "hs-reveal-delayed" : "hs-reveal-bars"}
    >
      <span className="sr-only">{LOADING_LABEL[view]}</span>
      {view === "dia" ? (
        <DayListSkeleton />
      ) : view === "semana" ? (
        <WeekView days={weekRange(dateKey).days} appointments={null} />
      ) : month ? (
        <MonthView days={month.days} monthKey={month.monthKey} dateKey={dateKey} appointments={null} />
      ) : null}
    </div>
  );
}
