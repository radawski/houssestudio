import type { CashboxBreakdown } from "@/lib/cashbox";
import { formatCurrency } from "@/lib/format";

/**
 * Tarjeta única de resumen (design/admin-iphone n-Caja / n-CajaSemana /
 * n-CajaMes): reemplaza a las tres tarjetas del escritorio, que en 390px
 * dejaban la mitad del alto vacío. El desktop conserva las tres detrás de
 * `hidden md:grid` en `page.tsx`.
 */
export function SummaryCard({ label, breakdown }: { label: string; breakdown: CashboxBreakdown }) {
  return (
    <div className="bg-card flex flex-col gap-2.5 rounded-md border border-[var(--hs-border-card)] p-3.5 md:hidden">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-muted-foreground text-[10px] font-medium tracking-[0.08em] uppercase">
          {label}
        </p>
        <p className="text-2xl font-semibold tracking-tight tabular-nums">
          {formatCurrency(breakdown.total)}
        </p>
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-[var(--hs-divider)] pt-2.5">
        <div className="flex items-baseline gap-2">
          <span className="text-muted-foreground text-xs">Efectivo</span>
          <span className="text-[15px] font-semibold tabular-nums">
            {formatCurrency(breakdown.byMethod.efectivo)}
          </span>
        </div>
        <span className="h-4 w-px shrink-0 bg-[var(--hs-divider)]" />
        <div className="flex items-baseline gap-2">
          <span className="text-muted-foreground text-xs">Transferencia</span>
          <span className="text-[15px] font-semibold tabular-nums">
            {formatCurrency(breakdown.byMethod.transferencia)}
          </span>
        </div>
      </div>
    </div>
  );
}
