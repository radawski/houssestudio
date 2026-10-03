"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { usePeriodLink, usePeriodNavigation } from "@/components/admin/period-navigation";
import { WalkInSaleButton } from "@/components/admin/walk-in-sale-button";
import type { SaleCatalog } from "@/lib/data/products";
import { Button } from "@/components/ui/button";
import { dayNumber } from "@/lib/agenda-day";
import { periodContainsToday, periodTitle, stepDateKey, stepFrom, type PeriodView } from "@/lib/period-nav";
import { todayKey, weekRange } from "@/lib/dates";
import { cn } from "@/lib/utils";

const WEEK_STRIP_LABELS = ["lun", "mar", "mié", "jue", "vie", "sáb", "dom"] as const;

function ViewSegments({ view, dateKey, className }: { view: PeriodView; dateKey: string; className?: string }) {
  return (
    <div role="group" aria-label="Vista" className={cn("bg-muted flex gap-0.5 rounded-md p-0.5", className)}>
      {(["dia", "semana", "mes"] as const).map((option) => (
        <ViewSegment key={option} option={option} active={view === option} dateKey={dateKey} />
      ))}
    </div>
  );
}

/** Cambiar de vista conserva la fecha: de Día 19 a Semana es la semana del 19. */
function ViewSegment({ option, active, dateKey }: { option: PeriodView; active: boolean; dateKey: string }) {
  const link = usePeriodLink(option, dateKey, "view");
  return (
    <Link
      {...link}
      aria-current={active ? "true" : undefined}
      className={cn(
        "flex-1 rounded px-3 py-1.5 text-center text-sm capitalize transition-colors md:flex-none md:py-1",
        active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {option === "dia" ? "día" : option}
    </Link>
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
      {days.map((day, index) => (
        <WeekStripDay key={day} day={day} label={WEEK_STRIP_LABELS[index]} active={day === dateKey} />
      ))}
    </div>
  );
}

function WeekStripDay({ day, label, active }: { day: string; label: string; active: boolean }) {
  const link = usePeriodLink("dia", day, "strip");
  return (
    <Link
      {...link}
      aria-current={active ? "date" : undefined}
      className={cn(
        "flex h-14 flex-1 flex-col items-center justify-center gap-0.5 rounded-md border",
        active
          ? "border-foreground bg-foreground text-background"
          : "border-[var(--hs-border-card)] bg-card text-muted-foreground",
      )}
    >
      <span className="text-[10px] uppercase tracking-wide">{label}</span>
      <span className="text-[15px] font-semibold tabular-nums">{dayNumber(day)}</span>
    </Link>
  );
}

/**
 * Flechas, título, Día/Semana/Mes y tira de días. Todo sale de la vista y la
 * fecha de `PeriodNavigation`, que cambian al toque: no hace falta esperar al
 * servidor para saber a qué día se fue.
 */
export function AgendaToolbar({ catalog }: { catalog: SaleCatalog }) {
  const { view, dateKey, pressed } = usePeriodNavigation();
  const previous = usePeriodLink(view, stepDateKey(view, dateKey, -1), "prev", stepFrom(-1));
  const next = usePeriodLink(view, stepDateKey(view, dateKey, 1), "next", stepFrom(1));
  const today = usePeriodLink(view, todayKey(), "today");

  return (
    <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center md:justify-between">
      <div className="flex items-center gap-1.5 md:gap-1">
        {/* La flecha tocada queda marcada mientras llegan los datos. */}
        <Button
          asChild
          variant="outline"
          size="icon-touch"
          className={cn("md:size-8", pressed === "prev" && "bg-[var(--hs-track)] text-foreground")}
        >
          <Link {...previous} aria-label="Anterior">
            <ChevronLeft className="size-4" />
          </Link>
        </Button>
        <Button
          asChild
          variant="outline"
          size="icon-touch"
          className={cn("md:size-8", pressed === "next" && "bg-[var(--hs-track)] text-foreground")}
        >
          <Link {...next} aria-label="Siguiente">
            <ChevronRight className="size-4" />
          </Link>
        </Button>
        {/* Con el período de hoy a la vista "Hoy" no haría nada: queda
            deshabilitado, y así también avisa dónde estás (n-AgendaHoy). */}
        {periodContainsToday(view, dateKey, todayKey()) ? (
          <Button
            variant="outline"
            size="sm"
            disabled
            className="order-last h-9 border-[var(--hs-border-card)] px-3 text-[13px] text-[var(--hs-mist)] disabled:opacity-100 md:order-none md:h-7"
          >
            Hoy
          </Button>
        ) : (
          <Button asChild variant="outline" size="sm" className="order-last h-9 px-3 text-[13px] md:order-none md:h-7">
            <Link {...today}>Hoy</Link>
          </Button>
        )}
        <h1 className="ml-1 flex-1 truncate text-base font-semibold first-letter:uppercase md:ml-2 md:flex-none">
          {periodTitle(view, dateKey)}
        </h1>
      </div>

      {/* `contents` en mobile: el wrapper no genera caja propia, así que
          `WalkInSaleButton` (que monta su FAB fixed sin envoltorio, Radix no
          agrega DOM) no queda escondido por un ancestro `hidden` — solo pasa
          a agrupar con `ViewSegments` cuando existe como fila real en
          desktop. */}
      <div className="contents md:flex md:items-center md:gap-3">
        <WalkInSaleButton catalog={catalog} />
        <ViewSegments view={view} dateKey={dateKey} className="hidden md:flex" />
      </div>

      <ViewSegments view={view} dateKey={dateKey} className="w-full md:hidden" />

      {view === "dia" ? <WeekStrip dateKey={dateKey} /> : null}
    </div>
  );
}
