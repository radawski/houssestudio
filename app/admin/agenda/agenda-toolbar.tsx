"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { useAgendaNavigation, type AgendaControl } from "@/app/admin/agenda/agenda-navigation";
import { WalkInSaleButton } from "@/components/admin/walk-in-sale-button";
import type { SaleCatalog } from "@/lib/data/products";
import { Button } from "@/components/ui/button";
import { dayNumber } from "@/lib/agenda-day";
import { agendaHref, agendaTitle, stepDateKey, type AgendaView } from "@/lib/agenda-nav";
import { todayKey, weekRange } from "@/lib/dates";
import { cn } from "@/lib/utils";

const WEEK_STRIP_LABELS = ["lun", "mar", "mié", "jue", "vie", "sáb", "dom"] as const;

/**
 * Link que, en un clic simple, navega sin esperar al servidor
 * (`AgendaNavigation`). Con modificadores (abrir en otra pestaña, etc.) o sin
 * JavaScript sigue siendo un link común.
 */
function useAgendaLink(view: AgendaView, dateKey: string, control: AgendaControl) {
  const navigation = useAgendaNavigation();
  // L1: solo la vista Día navega sin esperar; Semana y Mes se suman en L2,
  // cuando tengan su esqueleto.
  const optimistic = navigation.view === "dia" && view === "dia";

  return {
    href: agendaHref(view, dateKey),
    onClick: (event: React.MouseEvent<HTMLAnchorElement>) => {
      if (!optimistic) return;
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      navigation.navigate({ view, dateKey }, control);
    },
  };
}

function ViewSegments({ view, dateKey, className }: { view: AgendaView; dateKey: string; className?: string }) {
  return (
    <div role="group" aria-label="Vista" className={cn("bg-muted flex gap-0.5 rounded-md p-0.5", className)}>
      {(["dia", "semana", "mes"] as const).map((option) => (
        <Link
          key={option}
          href={agendaHref(option, dateKey)}
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
      {days.map((day, index) => (
        <WeekStripDay key={day} day={day} label={WEEK_STRIP_LABELS[index]} active={day === dateKey} />
      ))}
    </div>
  );
}

function WeekStripDay({ day, label, active }: { day: string; label: string; active: boolean }) {
  const link = useAgendaLink("dia", day, "strip");
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
 * fecha de `AgendaNavigation`, que cambian al toque: no hace falta esperar al
 * servidor para saber a qué día se fue.
 */
export function AgendaToolbar({ catalog }: { catalog: SaleCatalog }) {
  const { view, dateKey, pressed } = useAgendaNavigation();
  const previous = useAgendaLink(view, stepDateKey(view, dateKey, -1), "prev");
  const next = useAgendaLink(view, stepDateKey(view, dateKey, 1), "next");
  const today = useAgendaLink(view, todayKey(), "today");

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
        <Button asChild variant="ghost" size="sm" className="order-last h-9 md:order-none md:h-7">
          <Link {...today}>Hoy</Link>
        </Button>
        <h1 className="ml-1 flex-1 truncate text-base font-semibold first-letter:uppercase md:ml-2 md:flex-none">
          {agendaTitle(view, dateKey)}
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
