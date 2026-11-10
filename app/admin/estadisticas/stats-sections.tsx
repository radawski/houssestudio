import { ArrowDownRight, ArrowUpRight } from "lucide-react";

import type { StatsData } from "@/lib/data/stats";
import { formatCurrency } from "@/lib/format";
import { describeBusiest, share, signed } from "@/lib/stats";
import { cn } from "@/lib/utils";

/**
 * Secciones de Estadísticas (plan de noviembre, E1; prototipo
 * Estadisticas). Solo dibujan: los números llegan hechos de `getStats`.
 */

export const EYEBROW = "text-muted-foreground text-[11px] font-medium tracking-[0.12em] uppercase";
const LABEL = "text-muted-foreground text-[10px] font-medium tracking-[0.08em] uppercase";
const CARD = "bg-card rounded-md border border-[var(--hs-border-card)]";
const SMALL = "text-muted-foreground text-xs tabular-nums";

/** Tonos de la variación: verde si mejora, rojo si empeora, gris si da igual. */
export const TONE = {
  good: "bg-[#e7f3ee] text-[var(--hs-green)]",
  bad: "bg-[#fdeeec] text-[#9a2a22]",
  flat: "bg-[var(--hs-track)] text-muted-foreground",
} as const;

export function Chip({ tone, children }: { tone: keyof typeof TONE; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex h-[26px] shrink-0 items-center gap-1 rounded-full px-2.5 text-xs font-medium whitespace-nowrap tabular-nums",
        TONE[tone],
      )}
    >
      {children}
    </span>
  );
}

function Stat({
  label,
  value,
  note,
  alert = false,
}: {
  label: string;
  value: string | number;
  note: string;
  alert?: boolean;
}) {
  return (
    <div className={cn(CARD, "px-3 py-2.5", alert && "border-[#f3c9c4] bg-[#fdeeec] text-[#9a2a22]")}>
      <p className={cn(LABEL, alert && "text-[#9a2a22]")}>{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      <p className={cn(SMALL, "mt-0.5", alert && "text-[#9a2a22]")}>{note}</p>
    </div>
  );
}

export function RevenueSection({ stats }: { stats: StatsData }) {
  const { revenue } = stats;
  const cash = share(revenue.byMethod.efectivo, revenue.total);
  const transfer = revenue.total > 0 ? 100 - cash : 0;
  const change = revenue.change;

  return (
    <section className="space-y-2">
      <h2 className={EYEBROW}>Ingresos</h2>
      <div className={cn(CARD, "space-y-3 p-3.5")}>
        <div className="flex flex-wrap items-end justify-between gap-2.5">
          <div>
            <p className={LABEL}>{stats.view === "mes" ? "Total del mes" : "Total de la semana"}</p>
            <p className="mt-1 text-[28px] leading-tight font-semibold tabular-nums">{formatCurrency(revenue.total)}</p>
          </div>
          {change !== null ? (
            <Chip tone={change > 0 ? "good" : change < 0 ? "bad" : "flat"}>
              {change > 0 ? <ArrowUpRight className="size-3.5" /> : change < 0 ? <ArrowDownRight className="size-3.5" /> : null}
              {change === 0 ? "Igual que" : `${Math.abs(change)}% vs.`} {stats.previousLabel}
            </Chip>
          ) : null}
        </div>
        <div className="flex h-2.5 overflow-hidden rounded-full bg-[var(--hs-track)]" aria-hidden>
          <span className="bg-foreground" style={{ width: `${cash}%` }} />
          <span className="bg-[var(--hs-mist)]" style={{ width: `${transfer}%` }} />
        </div>
        <div className="flex justify-between gap-2.5">
          <div>
            <span className="flex items-center gap-1.5 text-[13px]">
              <span className="bg-foreground size-2.5 rounded-[2px]" />
              Efectivo
            </span>
            <p className="mt-0.5 text-sm font-medium tabular-nums">
              {formatCurrency(revenue.byMethod.efectivo)} · {cash}%
            </p>
          </div>
          <div className="text-right">
            <span className="flex items-center justify-end gap-1.5 text-[13px]">
              <span className="size-2.5 rounded-[2px] bg-[var(--hs-mist)]" />
              Transferencia
            </span>
            <p className="mt-0.5 text-sm font-medium tabular-nums">
              {formatCurrency(revenue.byMethod.transferencia)} · {transfer}%
            </p>
          </div>
        </div>
        <p className={SMALL}>
          Turnos {formatCurrency(revenue.appointments)} · ventas sueltas {formatCurrency(revenue.walkIns)}
        </p>
      </div>
    </section>
  );
}

export function OutcomesSection({ stats }: { stats: StatsData }) {
  const { outcomes, previousOutcomes } = stats;
  const pct = (n: number) => `${share(n, outcomes.total)}%`;

  const previous =
    previousOutcomes.total === 0
      ? null
      : previousOutcomes.noShow === 0
        ? "no faltó nadie"
        : `${previousOutcomes.noShow === 1 ? "faltó 1" : `faltaron ${previousOutcomes.noShow}`} (${share(previousOutcomes.noShow, previousOutcomes.total)}%)`;
  const previousLine = previous
    ? stats.view === "semana"
      ? ` La semana anterior ${previous}.`
      : ` En ${stats.previousLabel} ${previous}.`
    : "";

  return (
    <section className="space-y-2">
      <h2 className={EYEBROW}>Turnos</h2>
      <div className="grid grid-cols-3 gap-2">
        <Stat label="Atendidos" value={outcomes.attended} note={pct(outcomes.attended)} />
        <Stat label="Cancelados" value={outcomes.cancelled} note={pct(outcomes.cancelled)} />
        <Stat label="No vino" value={outcomes.noShow} note={pct(outcomes.noShow)} alert={outcomes.noShow > 0} />
      </div>
      <p className={SMALL}>
        Sobre {outcomes.total} {outcomes.total === 1 ? "turno agendado" : "turnos agendados"}.
        {outcomes.open > 0 ? ` ${outcomes.open} todavía por atender.` : ""}
        {previousLine}
      </p>
    </section>
  );
}

export function ClientsSection({ stats }: { stats: StatsData }) {
  const { clients, frequency, previousFrequency } = stats;
  const diff =
    frequency.average !== null && previousFrequency !== null ? frequency.average - previousFrequency : null;
  const buckets = frequency.buckets.filter((bucket, index) => index < 4 || bucket.count > 0);
  const max = Math.max(1, ...buckets.map((bucket) => bucket.count));

  return (
    <section className="space-y-2">
      <h2 className={EYEBROW}>Clientes</h2>
      <div className="grid grid-cols-2 gap-2">
        <Stat label="Nuevos" value={clients.nuevos} note="Primera visita" />
        <Stat label="Vuelven" value={clients.vuelven} note="Ya habían venido" />
      </div>
      <div className={cn(CARD, "space-y-3 p-3.5")}>
        <div className="flex flex-wrap items-end justify-between gap-2.5">
          <div>
            <p className={LABEL}>Frecuencia media de retorno</p>
            <p className="mt-1 text-[28px] leading-tight font-semibold tabular-nums">
              {frequency.average === null
                ? "Sin datos"
                : frequency.average === 1
                  ? "Cada 1 día"
                  : `Cada ${frequency.average} días`}
            </p>
          </div>
          {diff !== null ? (
            // Volver más seguido es bueno: menos días, verde.
            <Chip tone={diff < 0 ? "good" : diff > 0 ? "bad" : "flat"}>
              {signed(diff)} {Math.abs(diff) === 1 ? "día" : "días"} vs. {stats.previousLabel}
            </Chip>
          ) : null}
        </div>
        {frequency.customers > 0 ? (
          <div className="space-y-1.5">
            {buckets.map((bucket) => {
              const top = bucket.count === max && bucket.count > 0;
              return (
                <div key={bucket.label} className="grid grid-cols-[104px_minmax(0,1fr)_28px] items-center gap-2">
                  <span className={cn("text-xs", top ? "font-medium" : "text-muted-foreground")}>{bucket.label}</span>
                  <span className="h-3 overflow-hidden rounded-[3px] bg-[var(--hs-track)]">
                    <span
                      className={cn("block h-full", top ? "bg-foreground" : "bg-[var(--hs-mist)]")}
                      style={{ width: `${Math.round((bucket.count / max) * 100)}%` }}
                    />
                  </span>
                  <span className={cn("text-right text-[13px] tabular-nums", top && "font-semibold")}>
                    {bucket.count}
                  </span>
                </div>
              );
            })}
          </div>
        ) : null}
        <p className={cn(SMALL, "leading-relaxed")}>
          Cuántos días pasan, en promedio, hasta que un cliente vuelve.
          {frequency.customers > 0
            ? ` ${frequency.customers === 1 ? "Cuenta 1 cliente" : `Cuentan ${frequency.customers} clientes`} con 2 o más visitas que vinieron en los últimos 60 días.`
            : " Aparece cuando haya clientes con 2 o más visitas en los últimos 60 días."}
        </p>
      </div>
    </section>
  );
}

const SHADES = ["#f0f1f3", "#c9cdd2", "#8a9097", "#4a4f55", "#111315"];
const WEEKDAY_SHORT = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];

export function MovementSection({ stats }: { stats: StatsData }) {
  const { heatmap } = stats;
  const columns = heatmap.weekdays.length;

  return (
    <section className="space-y-2">
      <h2 className={EYEBROW}>Movimiento</h2>
      <div className={cn(CARD, "space-y-2.5 p-3.5")}>
        <p className="text-sm">
          {heatmap.busiest ? (
            <>
              Lo más lleno: <strong className="font-semibold">{describeBusiest(heatmap.busiest)}</strong>.
            </>
          ) : (
            "Todavía no hay turnos atendidos en este período."
          )}
        </p>
        <div
          className="grid items-center gap-1"
          style={{ gridTemplateColumns: `44px repeat(${columns}, minmax(0, 1fr))` }}
        >
          <span />
          {heatmap.weekdays.map((weekday) => (
            <span key={weekday} className="text-muted-foreground text-center text-[10px] tracking-[0.06em] uppercase">
              {WEEKDAY_SHORT[weekday]}
            </span>
          ))}
          {heatmap.rows.map((row) => (
            <div key={row.band.from} className="contents">
              <span className="text-muted-foreground text-[11px] tabular-nums">
                {row.band.from}–{row.band.to}
              </span>
              {row.cells.map((cell) => (
                <span
                  key={cell.weekday}
                  className="h-[30px] rounded"
                  style={{ background: SHADES[cell.level] }}
                  title={`${WEEKDAY_SHORT[cell.weekday]} ${row.band.from}–${row.band.to}: ${cell.count} ${cell.count === 1 ? "turno" : "turnos"}`}
                />
              ))}
            </div>
          ))}
        </div>
        <div className="text-muted-foreground flex items-center gap-1.5 text-xs" aria-hidden>
          Menos
          {SHADES.map((shade) => (
            <span key={shade} className="size-3.5 rounded-[2px]" style={{ background: shade }} />
          ))}
          Más
        </div>
        <p className={SMALL}>Turnos atendidos por día y franja horaria.</p>
      </div>
    </section>
  );
}
