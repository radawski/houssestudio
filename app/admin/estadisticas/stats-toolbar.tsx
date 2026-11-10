"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { BackHeader } from "@/components/admin/back-header";
import { PeriodLoadingRegion, usePeriodLink, usePeriodNavigation } from "@/components/admin/period-navigation";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { todayKey } from "@/lib/dates";
import { periodContainsToday, periodTitle, stepDateKey, stepFrom, type PeriodView } from "@/lib/period-nav";
import { cn } from "@/lib/utils";

function ViewSegment({ option, active, dateKey }: { option: PeriodView; active: boolean; dateKey: string }) {
  const link = usePeriodLink(option, dateKey, "view");
  return (
    <Link
      {...link}
      aria-current={active ? "true" : undefined}
      className={cn(
        "flex h-9 flex-1 items-center justify-center rounded-[4px] text-sm capitalize",
        active ? "bg-card text-foreground font-medium shadow-xs" : "text-muted-foreground",
      )}
    >
      {option}
    </Link>
  );
}

/**
 * Encabezado de Estadísticas (prototipo Estadisticas): ← Más, Semana / Mes
 * y las flechas con el período. No se avanza más allá del período de hoy:
 * no hay nada que mostrar del futuro.
 */
export function StatsToolbar() {
  const { view, dateKey, pressed } = usePeriodNavigation();
  const previous = usePeriodLink(view, stepDateKey(view, dateKey, -1), "prev", stepFrom(-1));
  const next = usePeriodLink(view, stepDateKey(view, dateKey, 1), "next", stepFrom(1));
  const atToday = periodContainsToday(view, dateKey, todayKey());

  return (
    <div className="space-y-3">
      <BackHeader title="Estadísticas" />
      <h1 className="hidden text-xl font-semibold md:block">Estadísticas</h1>

      <div role="group" aria-label="Período" className="flex gap-0.5 rounded-md bg-[var(--hs-divider)] p-[3px] md:max-w-xs">
        {(["semana", "mes"] as const).map((option) => (
          <ViewSegment key={option} option={option} active={view === option} dateKey={dateKey} />
        ))}
      </div>

      <div className="flex items-center gap-1.5 md:max-w-md">
        <Button
          asChild
          variant="outline"
          size="icon-touch"
          className={cn(pressed === "prev" && "text-foreground bg-[var(--hs-track)]")}
        >
          <Link {...previous} aria-label={view === "mes" ? "Mes anterior" : "Semana anterior"}>
            <ChevronLeft className="size-4" />
          </Link>
        </Button>
        <p className="flex-1 truncate text-center text-base font-semibold first-letter:uppercase">
          {periodTitle(view, dateKey)}
        </p>
        {atToday ? (
          <Button variant="outline" size="icon-touch" disabled aria-label="Siguiente (todavía no pasó)">
            <ChevronRight className="size-4" />
          </Button>
        ) : (
          <Button
            asChild
            variant="outline"
            size="icon-touch"
            className={cn(pressed === "next" && "text-foreground bg-[var(--hs-track)]")}
          >
            <Link {...next} aria-label={view === "mes" ? "Mes siguiente" : "Semana siguiente"}>
              <ChevronRight className="size-4" />
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}

/** Lo que se ve mientras llegan los números: la forma de cada sección. */
export function StatsSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-[178px] w-full rounded-md" />
      <div className="grid grid-cols-3 gap-2">
        <Skeleton className="h-[86px] rounded-md" />
        <Skeleton className="h-[86px] rounded-md" />
        <Skeleton className="h-[86px] rounded-md" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Skeleton className="h-[86px] rounded-md" />
        <Skeleton className="h-[86px] rounded-md" />
      </div>
      <Skeleton className="h-[220px] w-full rounded-md" />
    </div>
  );
}

/** Los datos del servidor, o el esqueleto mientras carga el período tocado. */
export function StatsBody({ children }: { children: React.ReactNode }) {
  const { skeleton } = usePeriodNavigation();
  if (!skeleton) return <>{children}</>;
  return (
    <PeriodLoadingRegion label="Cargando las estadísticas…" reveal="bars">
      <StatsSkeleton />
    </PeriodLoadingRegion>
  );
}
