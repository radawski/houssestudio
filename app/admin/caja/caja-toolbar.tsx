"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { NativeDatePill } from "@/components/admin/native-date-pill";
import { usePeriodLink, usePeriodNavigation } from "@/components/admin/period-navigation";
import { Button } from "@/components/ui/button";
import { todayKey } from "@/lib/dates";
import { periodContainsToday, periodTitle, stepDateKey, stepFrom, type PeriodView } from "@/lib/period-nav";
import { cn } from "@/lib/utils";

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
 * Mismo patrón de navegación que `agenda-toolbar.tsx` (incluido el
 * segmentado a todo el ancho en mobile), sin el botón de venta suelta ni la
 * tira de días — esos son propios de la agenda. Todo sale de la vista y la
 * fecha de `PeriodNavigation`, que cambian al toque.
 */
export function CajaToolbar() {
  const { view, dateKey, pressed, navigate } = usePeriodNavigation();
  const previous = usePeriodLink(view, stepDateKey(view, dateKey, -1), "prev", stepFrom(-1));
  const next = usePeriodLink(view, stepDateKey(view, dateKey, 1), "next", stepFrom(1));
  const today = usePeriodLink(view, todayKey(), "today");
  const title = periodTitle(view, dateKey);

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
        {/* "Hoy" es ghost en Caja (n-CajaHoy). Con el período de hoy a la
            vista no haría nada: queda deshabilitado, en mist. */}
        {periodContainsToday(view, dateKey, todayKey()) ? (
          <Button
            variant="ghost"
            size="sm"
            disabled
            className="order-last h-9 text-[var(--hs-mist)] disabled:opacity-100 md:order-none md:h-7"
          >
            Hoy
          </Button>
        ) : (
          <Button asChild variant="ghost" size="sm" className="order-last h-9 md:order-none md:h-7">
            <Link {...today}>Hoy</Link>
          </Button>
        )}
        {view === "dia" ? (
          // En la vista día el título es además el selector: tocarlo abre el
          // calendario nativo para saltar a cualquier fecha sin ir de a una.
          // Si la fecha salió de ahí, la píldora se atenúa hasta que llegan
          // los datos (n-CajaPeriodoDia).
          <h1 className="ml-1 flex min-w-0 flex-1 text-base font-semibold md:ml-2 md:flex-none md:text-sm">
            <NativeDatePill
              value={dateKey}
              label={title}
              pending={pressed === "picker"}
              onValueChange={(picked) => navigate({ view: "dia", dateKey: picked }, "picker")}
            />
          </h1>
        ) : (
          <h1 className="ml-1 flex-1 truncate text-base font-semibold first-letter:uppercase md:ml-2 md:flex-none">
            {title}
          </h1>
        )}
      </div>

      <div role="group" aria-label="Vista" className="bg-muted flex gap-0.5 rounded-md p-0.5 md:w-auto">
        {(["dia", "semana", "mes"] as const).map((option) => (
          <ViewSegment key={option} option={option} active={view === option} dateKey={dateKey} />
        ))}
      </div>
    </div>
  );
}
