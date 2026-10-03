"use client";

import { SummaryCard, SUMMARY_LABEL } from "@/app/admin/caja/caja-views";
import { CategoryCards } from "@/app/admin/caja/category-cards";
import { CategoryTable, DesktopSummary } from "@/app/admin/caja/category-table";
import { PeriodLoadingRegion, usePeriodNavigation } from "@/components/admin/period-navigation";
import type { PeriodView } from "@/lib/period-nav";

/**
 * Resumen y categorías sin datos (diseño "Estados de carga", n-CajaVistaDia):
 * etiquetas reales y barras donde van los montos. Lo usan `CajaBody` y el
 * `loading.tsx` de la ruta.
 */
export function CajaSkeletonBody({ view }: { view: PeriodView }) {
  const detail = view === "dia" ? "movimientos" : "conceptos";
  return (
    <div className="space-y-4">
      <SummaryCard label={SUMMARY_LABEL[view]} breakdown={null} />
      <DesktopSummary label={SUMMARY_LABEL[view]} breakdown={null} groups={null} />
      <CategoryCards groups={null} detail={detail} />
      <CategoryTable groups={null} breakdown={null} detail={detail} />
    </div>
  );
}

/**
 * El cuerpo de Caja: los datos del servidor, o el esqueleto de la vista
 * recién tocada mientras carga. Con plata en pantalla no se deja el total
 * anterior a la vista: un número viejo es peor que una barra (n-CajaPeriodoDia).
 */
export function CajaBody({ children }: { children: React.ReactNode }) {
  const { view, skeleton } = usePeriodNavigation();
  if (!skeleton) return <>{children}</>;

  return (
    <PeriodLoadingRegion label="Cargando la caja…" reveal="bars">
      <CajaSkeletonBody view={view} />
    </PeriodLoadingRegion>
  );
}
