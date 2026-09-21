"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { addDaysToKey, todayKey } from "@/lib/dates";
import { cn } from "@/lib/utils";

export type CajaView = "dia" | "semana" | "mes";

/** Cuánto se mueve cada flecha según la vista activa. */
const STEP_DAYS: Record<CajaView, number> = { dia: 1, semana: 7, mes: 30 };

function hrefFor(view: CajaView, dateKey: string) {
  return `/admin/caja?vista=${view}&fecha=${dateKey}`;
}

/**
 * Mismo patrón de navegación que `agenda-toolbar.tsx` (incluido el
 * segmentado a todo el ancho en mobile), sin el botón de venta suelta ni la
 * tira de días — esos son propios de la agenda.
 */
export function CajaToolbar({
  view,
  dateKey,
  title,
}: {
  view: CajaView;
  dateKey: string;
  title: string;
}) {
  const step = STEP_DAYS[view];

  return (
    <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center md:justify-between">
      <div className="flex items-center gap-1.5 md:gap-1">
        <Button asChild variant="outline" size="icon-touch" className="md:size-8">
          <Link href={hrefFor(view, addDaysToKey(dateKey, -step))} aria-label="Anterior">
            <ChevronLeft className="size-4" />
          </Link>
        </Button>
        <Button asChild variant="outline" size="icon-touch" className="md:size-8">
          <Link href={hrefFor(view, addDaysToKey(dateKey, step))} aria-label="Siguiente">
            <ChevronRight className="size-4" />
          </Link>
        </Button>
        <Button asChild variant="ghost" size="sm" className="order-last h-9 md:order-none md:h-7">
          <Link href={hrefFor(view, todayKey())}>Hoy</Link>
        </Button>
        <h1 className="ml-1 flex-1 truncate text-base font-semibold first-letter:uppercase md:ml-2 md:flex-none">
          {title}
        </h1>
      </div>

      <div
        role="group"
        aria-label="Vista"
        className="bg-muted flex gap-0.5 rounded-md p-0.5 md:w-auto"
      >
        {(["dia", "semana", "mes"] as const).map((option) => (
          <Link
            key={option}
            href={hrefFor(option, dateKey)}
            className={cn(
              "flex-1 rounded px-3 py-1.5 text-center text-sm capitalize transition-colors md:flex-none md:py-1",
              view === option
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {option === "dia" ? "día" : option}
          </Link>
        ))}
      </div>
    </div>
  );
}
