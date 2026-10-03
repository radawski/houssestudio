import { Skeleton } from "@/components/ui/skeleton";
import type { CashboxBreakdown } from "@/lib/cashbox";
import { formatCurrency } from "@/lib/format";
import type { PeriodView } from "@/lib/period-nav";

export const SUMMARY_LABEL: Record<PeriodView, string> = {
  dia: "Total del día",
  semana: "Total de la semana",
  mes: "Total del mes",
};

/** Monto, o su barra mientras carga: nunca `$ 0`, que se lee como "no hubo ventas". */
function Amount({ value, bar }: { value: number | undefined; bar: string }) {
  return value === undefined ? <Skeleton className={bar} /> : <>{formatCurrency(value)}</>;
}

/**
 * Tarjeta única de resumen (design/admin-iphone n-Caja / n-CajaSemana /
 * n-CajaMes): reemplaza a las tres tarjetas del escritorio, que en 390px
 * dejaban la mitad del alto vacío. El desktop conserva las tres detrás de
 * `hidden md:grid` en `page.tsx`.
 *
 * Con `breakdown = null` (cargando) las etiquetas quedan y los montos pasan a
 * barras (diseño "Estados de carga", n-CajaVistaDia).
 */
export function SummaryCard({ label, breakdown }: { label: string; breakdown: CashboxBreakdown | null }) {
  return (
    <div className="bg-card flex flex-col gap-2.5 rounded-md border border-[var(--hs-border-card)] p-3.5 md:hidden">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-muted-foreground text-[10px] font-medium tracking-[0.08em] uppercase">
          {label}
        </p>
        <div className="flex h-8 items-center text-2xl font-semibold tracking-tight tabular-nums">
          <Amount value={breakdown?.total} bar="h-6 w-[120px]" />
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-[var(--hs-divider)] pt-2.5">
        <div className="flex items-baseline gap-2">
          <span className="text-muted-foreground text-xs">Efectivo</span>
          <span className="flex h-[22px] items-center text-[15px] font-semibold tabular-nums">
            <Amount value={breakdown?.byMethod.efectivo} bar="h-[15px] w-16" />
          </span>
        </div>
        <span className="h-4 w-px shrink-0 bg-[var(--hs-divider)]" />
        <div className="flex items-baseline gap-2">
          <span className="text-muted-foreground text-xs">Transferencia</span>
          <span className="flex h-[22px] items-center text-[15px] font-semibold tabular-nums">
            <Amount value={breakdown?.byMethod.transferencia} bar="h-[15px] w-14" />
          </span>
        </div>
      </div>
    </div>
  );
}
