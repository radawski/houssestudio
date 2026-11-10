"use client";

import { useState } from "react";

import { Chip, EYEBROW } from "@/app/admin/estadisticas/stats-sections";
import { formatCurrency } from "@/lib/format";
import { weekdayOfKey } from "@/lib/recurring";
import { compareSeries, latestWeekdayOnOrBefore, sameWeekdaySeries, signed } from "@/lib/stats";
import { cn } from "@/lib/utils";

const DAYS = [
  { weekday: 1, short: "lun", long: "Lunes" },
  { weekday: 2, short: "mar", long: "Martes" },
  { weekday: 3, short: "mié", long: "Miércoles" },
  { weekday: 4, short: "jue", long: "Jueves" },
  { weekday: 5, short: "vie", long: "Viernes" },
  { weekday: 6, short: "sáb", long: "Sábado" },
];

type Metric = "ingresos" | "turnos";

/** "$102k" para que entre en la columna; los montos chicos, enteros. */
function compactMoney(value: number): string {
  return value >= 1000 ? `$${Math.round(value / 1000)}k` : `$${value}`;
}

function shortDate(dateKey: string): string {
  return `${Number(dateKey.slice(8))}/${Number(dateKey.slice(5, 7))}`;
}

/**
 * "Mismo día, semana a semana" (prototipo Estadisticas): un día de la semana
 * contra ese mismo día en las 7 semanas anteriores. Las diferencias van como
 * +n / −n, sin porcentajes (decisión del usuario). Arranca en el último día
 * que pasó (o hoy).
 */
export function SameDayCard({
  anchorKey,
  revenue,
  visits,
}: {
  anchorKey: string;
  revenue: Record<string, number>;
  visits: Record<string, number>;
}) {
  const anchorWeekday = weekdayOfKey(anchorKey);
  const [weekday, setWeekday] = useState(anchorWeekday === 0 ? 6 : anchorWeekday);
  const [metric, setMetric] = useState<Metric>("ingresos");

  const day = DAYS.find((d) => d.weekday === weekday)!;
  const series = sameWeekdaySeries(metric === "ingresos" ? revenue : visits, latestWeekdayOnOrBefore(anchorKey, weekday));
  const { latest, average, vsPrevious, vsAverage } = compareSeries(series);
  const short = metric === "ingresos" ? compactMoney : String;
  const full = (n: number) => (metric === "ingresos" ? formatCurrency(n) : `${n} ${n === 1 ? "turno" : "turnos"}`);
  const tone = (n: number | null) => (n === null || n === 0 ? "flat" : n > 0 ? "good" : "bad");
  const max = Math.max(1, ...series.map((point) => point.value));

  return (
    <section className="space-y-2">
      <h2 className={EYEBROW}>Mismo día, semana a semana</h2>
      <div className="bg-card space-y-3.5 rounded-md border border-[var(--hs-border-card)] p-3.5">
        <div role="group" aria-label="Día de la semana" className="grid grid-cols-6 gap-1">
          {DAYS.map((option) => (
            <button
              key={option.weekday}
              type="button"
              aria-pressed={option.weekday === weekday}
              onClick={() => setWeekday(option.weekday)}
              className={cn(
                "h-11 rounded-md border text-[13px]",
                option.weekday === weekday
                  ? "border-foreground bg-foreground text-background font-medium"
                  : "bg-card text-muted-foreground border-[var(--hs-border-card)]",
              )}
            >
              {option.short}
            </button>
          ))}
        </div>

        <div role="group" aria-label="Qué comparar" className="flex gap-0.5 rounded-md bg-[var(--hs-divider)] p-[3px]">
          {(["ingresos", "turnos"] as const).map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={metric === option}
              onClick={() => setMetric(option)}
              className={cn(
                "h-9 flex-1 rounded-[4px] text-sm capitalize",
                metric === option ? "bg-card text-foreground font-medium shadow-xs" : "text-muted-foreground",
              )}
            >
              {option}
            </button>
          ))}
        </div>

        <div>
          <p className="text-muted-foreground text-[10px] font-medium tracking-[0.08em] uppercase">
            {day.long} {shortDate(series[0].dateKey)}
          </p>
          <p className="mt-1 text-[28px] leading-tight font-semibold tabular-nums">{full(latest)}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {vsPrevious !== null ? (
              <Chip tone={tone(vsPrevious)}>
                {signed(vsPrevious, short)} vs. el {day.short} {shortDate(series[1].dateKey)}
              </Chip>
            ) : null}
            {vsAverage !== null ? (
              <Chip tone={tone(vsAverage)}>
                {signed(vsAverage, short)} vs. el promedio ({short(average)})
              </Chip>
            ) : null}
          </div>
        </div>

        <div className="space-y-1.5">
          {series.map((point, index) => {
            const older = series[index + 1];
            const delta = older ? point.value - older.value : null;
            const latestRow = index === 0;
            return (
              <div
                key={point.dateKey}
                className="grid min-h-7 grid-cols-[62px_minmax(0,1fr)_44px_48px] items-center gap-2"
                title={`${day.long} ${shortDate(point.dateKey)}: ${full(point.value)}`}
              >
                <span className={cn("text-xs tabular-nums", latestRow ? "font-semibold" : "text-muted-foreground")}>
                  {day.short} {shortDate(point.dateKey)}
                </span>
                <span className="relative h-3.5 overflow-hidden rounded-[3px] bg-[var(--hs-track)]">
                  <span
                    className={cn("absolute inset-y-0 left-0 rounded-[3px]", latestRow ? "bg-foreground" : "bg-[var(--hs-mist)]")}
                    style={{ width: `${Math.round((point.value / max) * 100)}%` }}
                  />
                  <span
                    className="absolute -inset-y-0.5 w-0.5 bg-[var(--hs-slate)]"
                    style={{ left: `${Math.min(99, Math.round((average / max) * 100))}%` }}
                  />
                </span>
                <span className={cn("text-right text-[13px] tabular-nums", latestRow && "font-semibold")}>
                  {short(point.value)}
                </span>
                <span
                  className={cn(
                    "text-right text-[11px] font-medium tabular-nums",
                    delta === null || delta === 0
                      ? "text-muted-foreground"
                      : delta > 0
                        ? "text-[var(--hs-green)]"
                        : "text-[#b0332a]",
                  )}
                >
                  {delta === null ? "" : signed(delta, short)}
                </span>
              </div>
            );
          })}
        </div>

        <div className="text-muted-foreground flex flex-wrap gap-x-3.5 gap-y-1 text-xs">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-0.5 bg-[var(--hs-slate)]" />
            Promedio de las semanas anteriores
          </span>
          <span>
            <span className="font-semibold text-[var(--hs-green)]">+</span>/
            <span className="font-semibold text-[#b0332a]">−</span> contra la semana de abajo
          </span>
        </div>
        <p className="text-muted-foreground text-xs">
          Elegí un día y mirá cómo le fue las últimas 8 semanas. Arriba, el más reciente.{" "}
          {metric === "turnos" ? "Cantidad de turnos atendidos." : "Montos en miles de pesos."}
        </p>
      </div>
    </section>
  );
}
