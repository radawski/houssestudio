"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { WalkInSaleButton } from "@/components/admin/walk-in-sale-button";
import { Button } from "@/components/ui/button";
import { dayNumber } from "@/lib/agenda-day";
import { addDaysToKey, todayKey, weekRange } from "@/lib/dates";
import { cn } from "@/lib/utils";

export type AgendaView = "dia" | "semana" | "mes";

/** Cuánto se mueve cada flecha según la vista activa. */
const STEP_DAYS: Record<AgendaView, number> = { dia: 1, semana: 7, mes: 30 };

const WEEK_STRIP_LABELS = ["lun", "mar", "mié", "jue", "vie", "sáb", "dom"] as const;

function hrefFor(view: AgendaView, dateKey: string) {
  return `/admin/agenda?vista=${view}&fecha=${dateKey}`;
}

function ViewSegments({ view, dateKey, className }: { view: AgendaView; dateKey: string; className?: string }) {
  return (
    <div role="group" aria-label="Vista" className={cn("bg-muted flex gap-0.5 rounded-md p-0.5", className)}>
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
  );
}

/**
 * Tira de 7 días de la semana activa (design/admin-iphone n-Agenda): salto
 * rápido dentro de la semana, aparte de las flechas ±1 día. Solo en la vista
 * día, solo mobile.
 */
function WeekStrip({ dateKey }: { dateKey: string }) {
  const { days } = weekRange(dateKey);

  return (
    <div className="flex gap-1.5 md:hidden">
      {days.map((day, index) => {
        const active = day === dateKey;
        return (
          <Link
            key={day}
            href={hrefFor("dia", day)}
            className={cn(
              "flex h-14 flex-1 flex-col items-center justify-center gap-0.5 rounded-md border",
              active
                ? "border-foreground bg-foreground text-background"
                : "border-[var(--hs-border-card)] bg-card text-muted-foreground",
            )}
          >
            <span className="text-[10px] uppercase tracking-wide">{WEEK_STRIP_LABELS[index]}</span>
            <span className="text-[15px] font-semibold tabular-nums">{dayNumber(day)}</span>
          </Link>
        );
      })}
    </div>
  );
}

export function AgendaToolbar({
  view,
  dateKey,
  title,
  services,
}: {
  view: AgendaView;
  dateKey: string;
  title: string;
  services: { id: string; name: string; price: number }[];
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

      {/* `contents` en mobile: el wrapper no genera caja propia, así que
          `WalkInSaleButton` (que monta su FAB fixed sin envoltorio, Radix no
          agrega DOM) no queda escondido por un ancestro `hidden` — solo pasa
          a agrupar con `ViewSegments` cuando existe como fila real en
          desktop. */}
      <div className="contents md:flex md:items-center md:gap-3">
        <WalkInSaleButton services={services} />
        <ViewSegments view={view} dateKey={dateKey} className="hidden md:flex" />
      </div>

      <ViewSegments view={view} dateKey={dateKey} className="w-full md:hidden" />

      {view === "dia" ? <WeekStrip dateKey={dateKey} /> : null}
    </div>
  );
}
