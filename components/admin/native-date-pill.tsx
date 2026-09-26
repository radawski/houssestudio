"use client";

import { useRef } from "react";
import { CalendarDays } from "lucide-react";

import { cn } from "@/lib/utils";

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Píldora de fecha que delega la elección al selector nativo del sistema:
 * calendario de iOS, diálogo Material en Android, el del navegador en
 * escritorio.
 *
 * El `<input type="date">` real va encima de toda la píldora con opacidad 0,
 * así que cualquier toque cae sobre él y el sistema abre su selector sin
 * depender de JavaScript propio. En escritorio, en cambio, un clic sobre el
 * texto del input (no sobre su ícono) solo lo enfoca en Chrome/Edge, y por eso
 * con mouse se llama además a `showPicker()`. Con el dedo no: iOS y Android
 * ya lo abren por su cuenta y una segunda llamada podría reabrirlo. El tipo
 * de puntero se toma del `pointerdown` y no del `click`, porque Safari de iOS
 * entrega el toque como un `click` con `pointerType` "mouse".
 *
 * El input es no controlado (`defaultValue` + `key`) y la elección se
 * confirma tanto en `change` como en `blur` (el cierre del calendario), por
 * si algún navegador no dispara `change` al cerrar. `lastSent` evita navegar
 * dos veces por la misma elección cuando llegan los dos eventos.
 *
 * `value` y lo que devuelve `onValueChange` son `yyyy-MM-dd` tal cual los da
 * el input, sin pasar por `Date`: convertirlos pasaría por UTC y en Argentina
 * correría la fecha un día (mismo motivo que `calendarDateToKey`).
 */
export function NativeDatePill({
  value,
  label,
  onValueChange,
  pending = false,
  className,
}: {
  value: string;
  /** Texto visible, ya formateado ("Sábado 26 de septiembre"). */
  label: string;
  onValueChange: (dateKey: string) => void;
  /** Atenúa la píldora mientras se carga la fecha elegida. */
  pending?: boolean;
  className?: string;
}) {
  const lastSent = useRef<{ from: string; to: string } | null>(null);
  const lastPointerType = useRef<string | null>(null);

  function commit(event: React.SyntheticEvent<HTMLInputElement>) {
    const next = event.currentTarget.value;
    // iOS permite "Restablecer" la fecha (valor vacío), y al tipear con
    // teclado el input puede pasar por años parciales como 0002: ninguno es
    // una elección.
    if (!DATE_KEY_PATTERN.test(next) || next < "2000-01-01") return;
    if (next === value) return;
    if (lastSent.current?.from === value && lastSent.current.to === next) return;
    lastSent.current = { from: value, to: next };
    onValueChange(next);
  }

  function handleClick(event: React.MouseEvent<HTMLInputElement>) {
    const pointerType = lastPointerType.current;
    lastPointerType.current = null;
    if (pointerType === "touch" || pointerType === "pen") return;
    try {
      event.currentTarget.showPicker();
    } catch {
      // Navegador sin `showPicker()` o que no lo permite en este contexto:
      // queda el comportamiento nativo del input.
    }
  }

  return (
    <div
      className={cn(
        "border-border bg-background focus-within:ring-ring/50 relative inline-flex h-11 min-w-0 items-center gap-2 rounded-full border px-3.5 transition-opacity focus-within:ring-3 md:h-8 md:px-3",
        pending && "opacity-60",
        className,
      )}
    >
      <CalendarDays className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
      <span className="truncate first-letter:uppercase" aria-hidden="true">
        {label}
      </span>
      <input
        // Remonta el input cuando llega la fecha nueva desde la URL, así su
        // valor interno vuelve a coincidir con `value` sin controlarlo.
        key={value}
        type="date"
        defaultValue={value}
        onChange={commit}
        onBlur={commit}
        onPointerDown={(event) => (lastPointerType.current = event.pointerType)}
        onClick={handleClick}
        aria-label={`Elegir fecha. Fecha actual: ${label}`}
        // `text-base` (16px): con menos, Safari de iOS hace zoom al enfocarlo.
        className="absolute inset-0 h-full w-full cursor-pointer appearance-none text-base opacity-0"
      />
    </div>
  );
}
