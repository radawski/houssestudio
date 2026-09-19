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
 * Mismo patrón de navegación que `agenda-toolbar.tsx`, sin el botón de
 * venta suelta (ese vive en la agenda). Duplicarlo entero es más simple que
 * parametrizar un solo componente para dos rutas con acciones distintas.
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
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-1">
        <Button asChild variant="outline" size="icon">
          <Link href={hrefFor(view, addDaysToKey(dateKey, -step))} aria-label="Anterior">
            <ChevronLeft className="size-4" />
          </Link>
        </Button>
        <Button asChild variant="outline" size="icon">
          <Link href={hrefFor(view, addDaysToKey(dateKey, step))} aria-label="Siguiente">
            <ChevronRight className="size-4" />
          </Link>
        </Button>
        <Button asChild variant="ghost" size="sm">
          <Link href={hrefFor(view, todayKey())}>Hoy</Link>
        </Button>
        <h1 className="ml-2 text-base font-semibold first-letter:uppercase">{title}</h1>
      </div>

      <div className="bg-muted flex rounded-md p-0.5">
        {(["dia", "semana", "mes"] as const).map((option) => (
          <Link
            key={option}
            href={hrefFor(option, dateKey)}
            className={cn(
              "rounded px-3 py-1 text-sm capitalize transition-colors",
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
