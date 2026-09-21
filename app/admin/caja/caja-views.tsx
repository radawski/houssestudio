import { averagePerOpenDay, bestDay, type CashboxBreakdown, type DayRevenue } from "@/lib/cashbox";
import type { CashboxMovement } from "@/lib/data/cashbox";
import { dayRange, isSameMonth, todayKey } from "@/lib/dates";
import {
  formatCompactAmount,
  formatCurrency,
  formatInTz,
  formatTime,
} from "@/lib/format";
import { cn } from "@/lib/utils";

const METHOD_LABEL = { efectivo: "Efectivo", transferencia: "Transferencia" } as const;
const ORIGIN_LABEL = { turno: "Turno", venta_suelta: "Venta suelta" } as const;
const WEEKDAY_SHORT_LOWER = ["lun", "mar", "mié", "jue", "vie", "sáb", "dom"] as const;

const dayNumber = (dateKey: string) => Number(dateKey.slice(8, 10));

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

/** Lista de movimientos del día (design/admin-iphone n-Caja): la Table de escritorio no entra en 390px. */
export function MovementsList({ movements }: { movements: CashboxMovement[] }) {
  if (movements.length === 0) {
    return (
      <div className="bg-card text-muted-foreground rounded-md border border-[var(--hs-border-card)] py-10 text-center text-sm md:hidden">
        Sin movimientos en este período.
      </div>
    );
  }

  return (
    <div className="bg-card overflow-hidden rounded-md border border-[var(--hs-border-card)] md:hidden">
      {movements.map((movement, index) => (
        <div
          key={`${movement.origin}-${movement.id}`}
          className={cn(
            "flex items-center justify-between gap-3 px-3.5 py-3",
            index < movements.length - 1 && "border-b border-[var(--hs-divider)]",
          )}
        >
          <div className="min-w-0">
            <p className="text-sm font-medium">{movement.serviceName}</p>
            <p className="text-muted-foreground mt-0.5 text-xs tabular-nums">
              {formatTime(movement.at)} · {ORIGIN_LABEL[movement.origin]}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[15px] font-semibold tabular-nums">{formatCurrency(movement.amount)}</p>
            <p className="text-muted-foreground mt-0.5 text-xs">{METHOD_LABEL[movement.method]}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function WeekDayRow({
  day,
  index,
  maxTotal,
}: {
  day: DayRevenue;
  index: number;
  maxTotal: number;
}) {
  const isToday = day.dateKey === todayKey();
  const label = `${WEEKDAY_SHORT_LOWER[index]} ${dayNumber(day.dateKey)}`;

  if (day.isClosed) {
    return (
      <div className="flex items-center gap-2.5 px-3.5 py-[11px]">
        <span className="text-muted-foreground w-13 shrink-0 text-[13px] tabular-nums">{label}</span>
        <span className="text-[var(--hs-mist)] flex-1 text-xs">Cerrado</span>
        <span className="text-[var(--hs-mist)] w-[74px] shrink-0 text-right text-[13px]">—</span>
      </div>
    );
  }

  const pct = maxTotal > 0 ? Math.round((day.total / maxTotal) * 100) : 0;

  return (
    <div className="flex items-center gap-2.5 px-3.5 py-[11px]">
      <span
        className={cn(
          "w-13 shrink-0 text-[13px] tabular-nums",
          isToday ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {label}
      </span>
      <span className="relative h-2 flex-1 overflow-hidden rounded-full bg-[var(--hs-track)]">
        <span
          className="bg-foreground absolute inset-y-0 left-0 rounded-full"
          style={{ width: `${pct}%` }}
        />
      </span>
      <span
        className={cn(
          "w-[74px] shrink-0 text-right text-[13px] tabular-nums",
          isToday ? "font-semibold" : "font-medium",
        )}
      >
        {formatCurrency(day.total)}
      </span>
    </div>
  );
}

/** Barras "Por día" de la semana (design/admin-iphone n-CajaSemana). */
export function WeekBars({ days }: { days: DayRevenue[] }) {
  const best = bestDay(days);
  const { average, openDays } = averagePerOpenDay(days);

  return (
    <section className="flex flex-col gap-2.5 md:hidden">
      <h2 className="text-muted-foreground text-[11px] font-medium tracking-[0.12em] uppercase">
        Por día
      </h2>
      <div className="bg-card overflow-hidden rounded-md border border-[var(--hs-border-card)]">
        {days.map((day, index) => (
          <div key={day.dateKey} className={index > 0 ? "border-t border-[var(--hs-divider)]" : ""}>
            <WeekDayRow day={day} index={index} maxTotal={best?.total ?? 0} />
          </div>
        ))}
      </div>
      <p className="text-muted-foreground text-xs tabular-nums">
        Promedio por día abierto · {formatCurrency(average)} · {openDays} día
        {openDays === 1 ? "" : "s"} abierto{openDays === 1 ? "" : "s"}
      </p>
    </section>
  );
}

/** Banda de magnitud relativa al mejor día del período (no un peso fijo: escala con el negocio). */
function heatBandClass(total: number, maxTotal: number): string {
  if (maxTotal <= 0) return "bg-[var(--hs-heat-1)]";
  const ratio = total / maxTotal;
  if (ratio <= 0.5) return "bg-[var(--hs-heat-1)]";
  if (ratio <= 0.75) return "bg-[var(--hs-heat-2)]";
  return "bg-[var(--hs-heat-3)]";
}

function MonthCell({
  cellKey,
  monthKey,
  revenue,
  maxTotal,
}: {
  cellKey: string;
  monthKey: string;
  revenue: DayRevenue | undefined;
  maxTotal: number;
}) {
  const today = todayKey();
  const inMonth = isSameMonth(cellKey, `${monthKey}-01`);
  const isToday = cellKey === today;
  const isFuture = cellKey > today;

  if (!inMonth) {
    return (
      <div className="flex h-[50px] flex-col items-center justify-center gap-0.5 rounded">
        <span className="text-xs tabular-nums text-[var(--hs-mist)]">{dayNumber(cellKey)}</span>
      </div>
    );
  }

  if (isFuture) {
    return (
      <div className="flex h-[50px] flex-col items-center justify-center gap-0.5 rounded">
        <span className="text-muted-foreground text-xs tabular-nums">{dayNumber(cellKey)}</span>
      </div>
    );
  }

  if (!revenue || revenue.isClosed) {
    return (
      <div className="flex h-[50px] flex-col items-center justify-center gap-0.5 rounded bg-[var(--hs-surface-closed)]">
        <span className="text-xs tabular-nums text-[var(--hs-mist)]">{dayNumber(cellKey)}</span>
        <span className="text-xs text-[var(--hs-mist)]">—</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex h-[50px] flex-col items-center justify-center gap-0.5 rounded border border-transparent",
        heatBandClass(revenue.total, maxTotal),
        isToday && "border-foreground",
      )}
    >
      <span className="text-xs tabular-nums">{dayNumber(cellKey)}</span>
      <span className="text-xs font-semibold tabular-nums">{formatCompactAmount(revenue.total)}</span>
    </div>
  );
}

/** Heatmap "Por día" del mes (design/admin-iphone n-CajaMes): totales, no una lista plana. */
export function MonthHeatmap({
  gridDays,
  monthKey,
  days,
}: {
  gridDays: string[];
  monthKey: string;
  days: DayRevenue[];
}) {
  const revenueByDay = new Map(days.map((day) => [day.dateKey, day]));
  const best = bestDay(days);
  const { average, openDays } = averagePerOpenDay(days);

  return (
    <section className="flex flex-col gap-2.5 md:hidden">
      <h2 className="text-muted-foreground text-[11px] font-medium tracking-[0.12em] uppercase">
        Por día
      </h2>

      <div className="bg-card rounded-md border border-[var(--hs-border-card)] p-2">
        <div className="grid grid-cols-7 gap-[3px] pb-[3px]">
          {WEEKDAY_SHORT_LOWER.map((label) => (
            <span
              key={label}
              className="text-muted-foreground text-center text-[10px] uppercase tracking-wide"
            >
              {label}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-[3px]">
          {gridDays.map((cellKey) => (
            <MonthCell
              key={cellKey}
              cellKey={cellKey}
              monthKey={monthKey}
              revenue={revenueByDay.get(cellKey)}
              maxTotal={best?.total ?? 0}
            />
          ))}
        </div>
      </div>

      <div className="bg-card overflow-hidden rounded-md border border-[var(--hs-border-card)]">
        <div className="flex items-baseline justify-between gap-3 border-b border-[var(--hs-divider)] px-3.5 py-[11px]">
          <span className="text-muted-foreground text-[13px]">
            {best ? `Mejor día · ${formatInTz(dayRange(best.dateKey).start, "EEEE d")}` : "Mejor día"}
          </span>
          <span className="text-sm font-semibold tabular-nums">
            {formatCurrency(best?.total ?? 0)}
          </span>
        </div>
        <div className="flex items-baseline justify-between gap-3 px-3.5 py-[11px]">
          <span className="text-muted-foreground text-[13px]">
            Promedio por día abierto · {openDays} día{openDays === 1 ? "" : "s"}
          </span>
          <span className="text-sm font-semibold tabular-nums">{formatCurrency(average)}</span>
        </div>
      </div>
    </section>
  );
}
