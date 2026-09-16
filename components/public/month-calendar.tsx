"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

/** Encabezados de columna, de lunes a domingo como se lee una semana acá. */
const WEEKDAY_HEADERS = ["LU", "MA", "MI", "JU", "VI", "SÁ", "DO"] as const;

/**
 * Toda la aritmética usa los campos locales del navegador (`getFullYear`,
 * `getMonth`, `getDate`) y nunca UTC, igual que `calendarDateToKey` en el
 * stepper. Mezclar ambos criterios correría las reservas un día.
 */
function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addLocalDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function monthKeyOf(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function dateKeyOf(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function firstDayOfMonth(monthKey: string): Date {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(year, month - 1, 1);
}

function addMonths(monthKey: string, amount: number): string {
  const first = firstDayOfMonth(monthKey);
  return monthKeyOf(new Date(first.getFullYear(), first.getMonth() + amount, 1));
}

const monthFormatter = new Intl.DateTimeFormat("es-AR", {
  month: "long",
  year: "numeric",
});

/**
 * Cuántos puntos lleva un día según los cupos que le queden.
 *
 * Es una lectura de un vistazo, no un número exacto: al cliente le alcanza con
 * saber si el día está holgado o al límite para decidir dónde mirar primero.
 */
function dotsFor(count: number): string {
  if (count > 7) return "•••";
  if (count > 3) return "••";
  return "•";
}

/**
 * Calendario mensual con la disponibilidad de cada día.
 *
 * El mes queda fijo mientras se elige: poder comparar días sin perder el
 * contexto es justamente lo que no permitía la tira de siete días que había
 * antes, que obligaba a navegar de a una semana para ver si el jueves siguiente
 * estaba más libre.
 *
 * Los días sin cupos se muestran apagados en lugar de ocultarse: ver que el
 * lunes está cerrado explica por qué no se puede elegir, mientras que un hueco
 * no explica nada.
 */
export function MonthCalendar({
  value,
  onChange,
  monthKey,
  onMonthChange,
  counts,
  loading,
  horizonDays,
}: {
  value?: Date;
  onChange: (date: Date) => void;
  monthKey: string;
  onMonthChange: (monthKey: string) => void;
  /** Cupos por `yyyy-MM-dd`. `null` mientras se consultan. */
  counts: Record<string, number> | null;
  loading: boolean;
  horizonDays: number;
}) {
  const today = startOfLocalDay(new Date());
  const lastDay = addLocalDays(today, horizonDays);

  const first = firstDayOfMonth(monthKey);
  const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();

  // `getDay()` da 0 para domingo; la grilla arranca en lunes, así que se corre.
  const leadingCells = (first.getDay() + 6) % 7;

  const canGoBack = monthKey > monthKeyOf(today);
  const canGoForward = firstDayOfMonth(addMonths(monthKey, 1)) <= lastDay;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-4">
        <p className="text-base first-letter:uppercase">{monthFormatter.format(first)}</p>

        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => onMonthChange(addMonths(monthKey, -1))}
            disabled={!canGoBack}
            aria-label="Mes anterior"
            className="border-border hover:bg-accent focus-visible:ring-ring flex size-8 items-center justify-center border transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => onMonthChange(addMonths(monthKey, 1))}
            disabled={!canGoForward}
            aria-label="Mes siguiente"
            className="border-border hover:bg-accent focus-visible:ring-ring flex size-8 items-center justify-center border transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {WEEKDAY_HEADERS.map((label) => (
          <div key={label} className="text-muted-foreground text-center text-[10px]">
            {label}
          </div>
        ))}

        {Array.from({ length: daysInMonth }, (_, index) => {
          const day = index + 1;
          const date = new Date(first.getFullYear(), first.getMonth(), day);
          const count = counts?.[dateKeyOf(date)] ?? 0;

          const isPast = date < today;
          const isBeyondHorizon = date > lastDay;
          // Mientras cargan los cupos no se habilita nada: dejar los días
          // clicleables con datos viejos permitiría elegir uno que ya no tiene
          // lugar y descubrirlo recién en la grilla de horarios.
          const isDisabled = loading || counts === null || count === 0 || isPast || isBeyondHorizon;
          const isSelected = value ? isSameLocalDay(date, value) : false;

          return (
            <button
              key={day}
              type="button"
              disabled={isDisabled}
              onClick={() => onChange(date)}
              aria-pressed={isSelected}
              aria-label={date.toLocaleDateString("es-AR", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
              style={index === 0 ? { gridColumnStart: leadingCells + 1 } : undefined}
              className={cn(
                "focus-visible:ring-ring flex aspect-square flex-col items-center justify-center gap-0.5 border transition-colors focus-visible:ring-2 focus-visible:outline-none",
                isSelected
                  ? "border-foreground bg-foreground text-background"
                  : "border-border hover:bg-accent",
                isDisabled &&
                  "text-muted-foreground cursor-not-allowed opacity-35 hover:bg-transparent",
              )}
            >
              <span className="text-[13px] tabular-nums">{day}</span>
              <span
                aria-hidden
                className={cn(
                  "text-[8px] leading-none tracking-[1px]",
                  isSelected ? "text-background/70" : "text-muted-foreground",
                )}
              >
                {isDisabled ? "" : dotsFor(count)}
              </span>
            </button>
          );
        })}
      </div>

      <div className="text-muted-foreground mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[10px]">
        <span>••• muchos cupos</span>
        <span>• pocos</span>
        <span>apagado = sin cupos</span>
      </div>
    </div>
  );
}
