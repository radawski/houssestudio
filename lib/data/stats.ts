import "server-only";

import { TZDate } from "@date-fns/tz";

import { splitFromColumns, summarizeCharges, type Charge } from "@/lib/cashbox";
import { BUSINESS_TIMEZONE } from "@/lib/config";
import { fetchBusinessDays } from "@/lib/data/availability";
import { addDaysToKey, dayRange, exactMonthRange, todayKey, toDateKey, weekRange } from "@/lib/dates";
import { formatInTz } from "@/lib/format";
import { stepDateKey } from "@/lib/period-nav";
import {
  buildHeatmap,
  countOutcomes,
  hourBands,
  newVsReturning,
  percentChange,
  returnFrequency,
  type Heatmap,
  type Outcomes,
  type ReturnFrequency,
  type Visit,
} from "@/lib/stats";
import { createClient } from "@/lib/supabase/server";
import type { AppointmentStatus, PaymentMethod } from "@/lib/supabase/database.types";

/**
 * Estadísticas (plan de noviembre, E1): trae las filas y arma todo con las
 * funciones puras de `lib/stats.ts`. Va por la sesión del admin (RLS), como
 * el resto del panel.
 *
 * Los ingresos se cuentan como en Caja: por cuándo se cobró (`paid_at`,
 * `sold_at`). Los turnos y las visitas, por cuándo era el turno.
 */

export type StatsView = "semana" | "mes";

/** Cuántas semanas mira "Mismo día, semana a semana". */
export const SAME_DAY_WEEKS = 8;

export type StatsData = {
  view: StatsView;
  /** "la semana anterior" o "septiembre". */
  previousLabel: string;
  revenue: {
    total: number;
    byMethod: Record<PaymentMethod, number>;
    appointments: number;
    walkIns: number;
    change: number | null;
  };
  outcomes: Outcomes;
  previousOutcomes: Outcomes;
  clients: { nuevos: number; vuelven: number };
  frequency: ReturnFrequency;
  previousFrequency: number | null;
  sameDay: {
    /** Último día que se mira: hoy, o el último del período si ya pasó. */
    anchorKey: string;
    revenue: Record<string, number>;
    visits: Record<string, number>;
  };
  heatmap: Heatmap;
};

type Range = { start: Date; end: Date; firstKey: string; lastKey: string };

function rangeFor(view: StatsView, dateKey: string): Range {
  if (view === "semana") {
    const { start, end, days } = weekRange(dateKey);
    return { start, end, firstKey: days[0], lastKey: days[6] };
  }
  const { start, end } = exactMonthRange(dateKey);
  return { start, end, firstKey: toDateKey(start), lastKey: toDateKey(new Date(end.getTime() - 1)) };
}

/**
 * PostgREST corta en 1000 filas por pedido: se trae de a páginas. Con un
 * solo peluquero son pocas, pero el historial de visitas crece con los años.
 */
async function fetchAll<T>(
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<T[]> {
  const size = 1000;
  const rows: T[] = [];
  for (let from = 0; ; from += size) {
    const { data, error } = await page(from, from + size - 1);
    if (error) throw new Error(`No se pudieron leer las estadísticas: ${error.message}`);
    rows.push(...(data ?? []));
    if (!data || data.length < size) return rows;
  }
}

type MoneyRow = {
  amount: number;
  method: PaymentMethod;
  cash_amount: number | null;
  transfer_amount: number | null;
  at: string;
  kind: "turno" | "venta";
};

function local(date: string) {
  const tz = new TZDate(new Date(date), BUSINESS_TIMEZONE);
  return { weekday: tz.getDay(), minutes: tz.getHours() * 60 + tz.getMinutes() };
}

export async function getStats(view: StatsView, dateKey: string): Promise<StatsData> {
  const supabase = await createClient();
  const today = todayKey();

  const range = rangeFor(view, dateKey);
  const previous = rangeFor(view, stepDateKey(view, dateKey, -1));
  const anchorKey = range.lastKey < today ? range.lastKey : today;
  // El mismo día de las 8 semanas: del último lunes a sábado hasta el ancla,
  // 7 semanas para atrás.
  const seriesFirstKey = addDaysToKey(anchorKey, -7 * SAME_DAY_WEEKS + 1);
  const moneyFrom = new Date(
    Math.min(previous.start.getTime(), dayRange(seriesFirstKey).start.getTime()),
  ).toISOString();
  const end = range.end.toISOString();

  const [payments, sales, appointments, visitsRows, days] = await Promise.all([
    fetchAll((from, to) =>
      supabase
        .from("payments")
        .select("amount, method, cash_amount, transfer_amount, paid_at, appointment:appointments(status)")
        .gte("paid_at", moneyFrom)
        .lt("paid_at", end)
        .order("paid_at")
        .range(from, to),
    ),
    fetchAll((from, to) =>
      supabase
        .from("walk_in_sales")
        .select("amount, method, cash_amount, transfer_amount, sold_at")
        .gte("sold_at", moneyFrom)
        .lt("sold_at", end)
        .order("sold_at")
        .range(from, to),
    ),
    fetchAll((from, to) =>
      supabase
        .from("appointments")
        .select("status, starts_at")
        .gte("starts_at", previous.start.toISOString())
        .lt("starts_at", end)
        .order("starts_at")
        .range(from, to),
    ),
    // Todas las visitas hasta el fin del período: para nuevos/vuelven y la
    // frecuencia hace falta la historia de cada cliente.
    fetchAll((from, to) =>
      supabase
        .from("appointments")
        .select("customer_id, starts_at")
        .eq("status", "completado")
        .lt("starts_at", end)
        .order("starts_at")
        .range(from, to),
    ),
    fetchBusinessDays(supabase),
  ]);

  // --- Ingresos -----------------------------------------------------------------
  type PaymentRow = Omit<MoneyRow, "at" | "kind"> & { paid_at: string; appointment: { status: string } | null };
  const money: MoneyRow[] = [
    // Igual que Caja: el cobro de un turno cancelado no suma.
    ...(payments as unknown as PaymentRow[])
      .filter((row) => row.appointment?.status !== "cancelado")
      .map((row) => ({
        amount: row.amount,
        method: row.method,
        cash_amount: row.cash_amount,
        transfer_amount: row.transfer_amount,
        at: row.paid_at,
        kind: "turno" as const,
      })),
    ...(sales as (Omit<MoneyRow, "at" | "kind"> & { sold_at: string })[]).map(({ sold_at, ...row }) => ({
      ...row,
      at: sold_at,
      kind: "venta" as const,
    })),
  ];
  const toCharge = (row: MoneyRow): Charge => ({
    amount: Number(row.amount),
    method: row.method,
    split: splitFromColumns(row.cash_amount, row.transfer_amount),
  });
  const inTime = (at: string, r: Range) => {
    const time = new Date(at).getTime();
    return time >= r.start.getTime() && time < r.end.getTime();
  };

  const current = money.filter((row) => inTime(row.at, range));
  const summary = summarizeCharges(current.map(toCharge));
  const previousTotal = summarizeCharges(money.filter((row) => inTime(row.at, previous)).map(toCharge)).total;
  const sumOf = (rows: MoneyRow[]) => rows.reduce((total, row) => total + Number(row.amount), 0);

  const revenueByDay: Record<string, number> = {};
  for (const row of money) {
    const key = toDateKey(new Date(row.at));
    if (key >= seriesFirstKey && key <= anchorKey) revenueByDay[key] = (revenueByDay[key] ?? 0) + Number(row.amount);
  }

  // --- Turnos -------------------------------------------------------------------
  type StatusRow = { status: AppointmentStatus; starts_at: string };
  const statusRows = appointments as StatusRow[];
  const outcomes = countOutcomes(statusRows.filter((row) => inTime(row.starts_at, range)).map((row) => row.status));
  const previousOutcomes = countOutcomes(
    statusRows.filter((row) => inTime(row.starts_at, previous)).map((row) => row.status),
  );

  // --- Clientes y frecuencia ----------------------------------------------------
  const visitRows = visitsRows as { customer_id: string; starts_at: string }[];
  const visits: Visit[] = visitRows.map((row) => ({
    customerId: row.customer_id,
    dateKey: toDateKey(new Date(row.starts_at)),
  }));
  const visitsByDay: Record<string, number> = {};
  for (const visit of visits) {
    if (visit.dateKey >= seriesFirstKey && visit.dateKey <= anchorKey) {
      visitsByDay[visit.dateKey] = (visitsByDay[visit.dateKey] ?? 0) + 1;
    }
  }

  // --- Movimiento ---------------------------------------------------------------
  const open = days.filter((day) => !day.is_closed && day.ranges.length > 0);
  const opens = open.flatMap((day) => day.ranges.map((r) => Number(r.opens_at.slice(0, 2))));
  const closes = open.flatMap((day) =>
    day.ranges.map((r) => Math.ceil(Number(r.closes_at.slice(0, 2)) + Number(r.closes_at.slice(3, 5)) / 60)),
  );
  const bands = hourBands(opens.length ? Math.min(...opens) : 9, closes.length ? Math.max(...closes) : 21);
  const starts = visitRows.filter((row) => inTime(row.starts_at, range)).map((row) => local(row.starts_at));
  // Lunes a sábado; el domingo solo si ese día se abre o hubo turnos.
  const weekdays = [1, 2, 3, 4, 5, 6];
  if (open.some((day) => day.weekday === 0) || starts.some((s) => s.weekday === 0)) weekdays.push(0);

  return {
    view,
    previousLabel:
      view === "semana" ? "la semana anterior" : formatInTz(previous.start, "MMMM"),
    revenue: {
      total: summary.total,
      byMethod: summary.byMethod,
      appointments: sumOf(current.filter((row) => row.kind === "turno")),
      walkIns: sumOf(current.filter((row) => row.kind === "venta")),
      change: percentChange(summary.total, previousTotal),
    },
    outcomes,
    previousOutcomes,
    clients: newVsReturning(visits, range.firstKey, range.lastKey),
    frequency: returnFrequency(visits, anchorKey),
    previousFrequency: returnFrequency(visits, previous.lastKey).average,
    sameDay: { anchorKey, revenue: revenueByDay, visits: visitsByDay },
    heatmap: buildHeatmap(starts, bands, weekdays),
  };
}
