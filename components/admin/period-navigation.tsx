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

import {
  holdReducer,
  showSkeleton,
  SKELETON_DELAY_MS,
  SKELETON_MIN_MS,
} from "@/lib/loading-hold";
import { periodHref, type PeriodBasePath, type PeriodView } from "@/lib/period-nav";

type PeriodPosition = { view: PeriodView; dateKey: string };

/**
 * Qué control disparó la navegación en curso: la flecha tocada queda marcada
 * y la píldora de fecha de Caja se atenúa si se eligió desde el calendario.
 */
export type PeriodControl = "prev" | "next" | "today" | "strip" | "view" | "picker";

type PeriodNavigationValue = PeriodPosition & {
  basePath: PeriodBasePath;
  /** Hay una navegación en curso: lo que muestra el servidor no es lo pedido. */
  loading: boolean;
  /** El cuerpo va a esqueleto (con la demora y el mínimo de `lib/loading-hold`). */
  skeleton: boolean;
  pressed: PeriodControl | null;
  navigate: (to: PeriodPosition, control: PeriodControl) => void;
  /** La última posición pedida, aunque todavía no se haya dibujado. */
  latest: () => PeriodPosition;
};

const PeriodNavigationContext = createContext<PeriodNavigationValue | null>(null);

export function usePeriodNavigation(): PeriodNavigationValue {
  const value = useContext(PeriodNavigationContext);
  if (!value) throw new Error("usePeriodNavigation va dentro de <PeriodNavigation>.");
  return value;
}

/**
 * Navegación por período sin esperar al servidor, en Agenda y Caja (L1–L3,
 * tasks/plan-mejoras-octubre.md).
 *
 * La página del servidor sigue trayendo todo antes de responder; mientras
 * tanto `useOptimistic` guarda la vista y la fecha recién tocadas. Con eso el
 * toolbar (título, tira, flechas) salta al toque, y el cuerpo muestra el
 * esqueleto mientras lo pedido no coincida con lo que trajo el servidor. Esa
 * comparación también cubre los toques seguidos: ▶ ▶ ▶ avanza desde la fecha
 * ya avanzada, y una respuesta vieja que llegue en el medio no se pinta.
 */
export function PeriodNavigation({
  basePath,
  view,
  dateKey,
  children,
}: PeriodPosition & { basePath: PeriodBasePath; children: React.ReactNode }) {
  const router = useRouter();
  const [position, setPosition] = useOptimistic<PeriodPosition>({ view, dateKey });
  const [phase, dispatch] = useReducer(holdReducer, "idle");
  const [pressed, setPressed] = useState<PeriodControl | null>(null);

  const loading = position.view !== view || position.dateKey !== dateKey;

  // Los temporizadores leen si la carga sigue en curso al vencer, no cuando
  // se crearon.
  const loadingRef = useRef(loading);
  useEffect(() => {
    loadingRef.current = loading;
  });

  // La última posición pedida. Se actualiza en `navigate`, en el mismo
  // toque, y no en el render: dos toques que lleguen antes de que React
  // vuelva a dibujar tienen que encadenarse igual (▶ ▶ = dos días).
  const latest = useRef<PeriodPosition>(position);
  useEffect(() => {
    latest.current = position;
  }, [position]);

  const delayTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const minTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(
    () => () => {
      clearTimeout(delayTimer.current);
      clearTimeout(minTimer.current);
    },
    [],
  );

  function navigate(to: PeriodPosition, control: PeriodControl) {
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
    latest.current = to;
    startTransition(() => {
      setPosition(to);
      router.push(periodHref(basePath, to.view, to.dateKey));
    });
  }

  return (
    <PeriodNavigationContext.Provider
      value={{
        ...position,
        basePath,
        loading,
        skeleton: showSkeleton(loading, phase),
        pressed: loading ? pressed : null,
        navigate,
        latest: () => latest.current,
      }}
    >
      {children}
    </PeriodNavigationContext.Provider>
  );
}

/**
 * Props de un `<Link>` que, en un clic simple, navega sin esperar al
 * servidor. Con modificadores (abrir en otra pestaña, etc.) o sin JavaScript
 * sigue siendo un link común.
 *
 * `relative` recalcula el destino en el momento del toque a partir de la
 * última posición pedida (las flechas: ▶ ▶ avanza dos aunque el segundo toque
 * llegue antes del nuevo dibujo). Sin él, el destino es el del `href`.
 */
export function usePeriodLink(
  view: PeriodView,
  dateKey: string,
  control: PeriodControl,
  relative?: (latest: PeriodPosition) => PeriodPosition,
) {
  const navigation = usePeriodNavigation();

  return {
    href: periodHref(navigation.basePath, view, dateKey),
    onClick: (event: React.MouseEvent<HTMLAnchorElement>) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      navigation.navigate(relative ? relative(navigation.latest()) : { view, dateKey }, control);
    },
  };
}

/**
 * Región `status` del esqueleto de un cuerpo. Se monta al tocar y espera
 * 200 ms antes de verse:
 * - `block`: espera todo (no hay nada que pintar sin datos).
 * - `bars`: solo esperan las barras; lo que se calcula sin pedir nada (días,
 *   grilla, etiquetas) se ve desde el primer cuadro.
 */
export function PeriodLoadingRegion({
  label,
  reveal,
  children,
}: {
  label: string;
  reveal: "block" | "bars";
  children: React.ReactNode;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={reveal === "block" ? "hs-reveal-delayed" : "hs-reveal-bars"}
    >
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}
