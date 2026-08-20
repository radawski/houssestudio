"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

/** Índice = `getDay()`, con 0 = domingo. */
const WEEKDAY_ABBR = ["do", "lu", "ma", "mi", "ju", "vi", "sá"] as const;

const VISIBLE_DAYS = 7;

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

const monthFormatter = new Intl.DateTimeFormat("es-AR", {
  month: "long",
  year: "numeric",
});

/**
 * Calendario horizontal de una semana con navegación por flechas.
 *
 * Reemplaza a la grilla mensual porque el paso tiene que entrar en una pantalla
 * junto con los horarios. Los días sin atención se muestran deshabilitados en
 * vez de ocultarse: ver que el lunes está cerrado explica por qué no se puede
 * elegir, mientras que un hueco no explica nada.
 */
export function DateStrip({
  value,
  onChange,
  closedWeekdays,
  horizonDays,
}: {
  value?: Date;
  onChange: (date: Date) => void;
  closedWeekdays: number[];
  horizonDays: number;
}) {
  const today = startOfLocalDay(new Date());
  const lastDay = addLocalDays(today, horizonDays);

  // La ventana arranca en el día elegido, si ya hay uno, para que al volver al
  // paso anterior la selección siga a la vista.
  const [windowStart, setWindowStart] = useState<Date>(() =>
    value ? startOfLocalDay(value) : today,
  );

  const days = Array.from({ length: VISIBLE_DAYS }, (_, index) =>
    addLocalDays(windowStart, index),
  );

  const canGoBack = windowStart > today;
  const canGoForward = addLocalDays(windowStart, VISIBLE_DAYS) <= lastDay;

  const shift = (amount: number) => {
    const next = addLocalDays(windowStart, amount);
    setWindowStart(next < today ? today : next);
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-4">
        <p className="text-sm first-letter:uppercase">
          {monthFormatter.format(windowStart)}
        </p>

        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => shift(-VISIBLE_DAYS)}
            disabled={!canGoBack}
            aria-label="Semana anterior"
            className="border-border hover:bg-accent focus-visible:ring-ring flex size-9 items-center justify-center border transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => shift(VISIBLE_DAYS)}
            disabled={!canGoForward}
            aria-label="Semana siguiente"
            className="border-border hover:bg-accent focus-visible:ring-ring flex size-9 items-center justify-center border transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {days.map((day) => {
          const isClosed = closedWeekdays.includes(day.getDay());
          const isPast = day < today;
          const isBeyond = day > lastDay;
          const isDisabled = isClosed || isPast || isBeyond;
          const isSelected = value ? isSameLocalDay(day, value) : false;

          return (
            <button
              key={day.toDateString()}
              type="button"
              disabled={isDisabled}
              onClick={() => onChange(day)}
              aria-pressed={isSelected}
              aria-label={day.toLocaleDateString("es-AR", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
              className={cn(
                "focus-visible:ring-ring flex flex-col items-center gap-1 border py-3 transition-colors focus-visible:ring-2 focus-visible:outline-none",
                isSelected
                  ? "border-foreground bg-foreground text-background"
                  : "border-border hover:bg-accent",
                isDisabled && "text-muted-foreground cursor-not-allowed opacity-35 hover:bg-transparent",
              )}
            >
              <span className="text-[11px] tracking-[0.08em] uppercase">
                {WEEKDAY_ABBR[day.getDay()]}
              </span>
              <span className="text-lg font-light tabular-nums">{day.getDate()}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
