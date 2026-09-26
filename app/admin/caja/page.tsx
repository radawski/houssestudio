import type { Metadata } from "next";

import { CajaToolbar, type CajaView } from "@/app/admin/caja/caja-toolbar";
import { MonthHeatmap, MovementsList, SummaryCard, WeekBars } from "@/app/admin/caja/caja-views";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { weekdayOf } from "@/lib/availability";
import { buildDayRevenues, type DayRevenue } from "@/lib/cashbox";
import { getClosedWeekdays } from "@/lib/data/appointments";
import { getCashboxSummary } from "@/lib/data/cashbox";
import {
  dayRange,
  exactMonthRange,
  monthDateKeys,
  monthRange,
  todayKey,
  weekRange,
} from "@/lib/dates";
import { formatCurrency, formatDateTime, formatInTz, formatLongDate } from "@/lib/format";

export const metadata: Metadata = { title: "Caja" };

export const dynamic = "force-dynamic";

const VIEWS: CajaView[] = ["dia", "semana", "mes"];
const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const SUMMARY_LABEL: Record<CajaView, string> = {
  dia: "Total del día",
  semana: "Total de la semana",
  mes: "Total del mes",
};

const METHOD_LABEL = { efectivo: "Efectivo", transferencia: "Transferencia" } as const;
const ORIGIN_LABEL = { turno: "Turno", venta_suelta: "Venta suelta", producto: "Producto" } as const;

function DesktopSummaryCard({ label, amount }: { label: string; amount: number }) {
  return (
    <Card>
      <CardContent className="py-4">
        <p className="text-muted-foreground text-xs tracking-[0.08em] uppercase">{label}</p>
        <p className="mt-1 text-2xl font-semibold tabular-nums">{formatCurrency(amount)}</p>
      </CardContent>
    </Card>
  );
}

export default async function CajaPage({ searchParams }: PageProps<"/admin/caja">) {
  const { vista, fecha } = await searchParams;

  const view = VIEWS.includes(vista as CajaView) ? (vista as CajaView) : "dia";
  const dateKey =
    typeof fecha === "string" && DATE_KEY_PATTERN.test(fecha) ? fecha : todayKey();

  let range: { start: Date; end: Date };
  let title: string;

  if (view === "dia") {
    range = dayRange(dateKey);
    title = formatLongDate(range.start);
  } else if (view === "semana") {
    const { start, end, days } = weekRange(dateKey);
    range = { start, end };
    title = `${formatInTz(start, "d 'de' MMMM")} – ${formatInTz(dayRange(days[6]).start, "d 'de' MMMM")}`;
  } else {
    const { start, end, monthKey } = exactMonthRange(dateKey);
    range = { start, end };
    title = formatInTz(dayRange(`${monthKey}-01`).start, "MMMM yyyy");
  }

  const { movements, breakdown } = await getCashboxSummary({
    start: range.start.toISOString(),
    end: range.end.toISOString(),
  });

  // Solo semana y mes agrupan por día (huecos/heatmap), así que solo ahí
  // vale la pena la consulta extra de qué días de la semana el local no abre.
  let weekDays: DayRevenue[] | null = null;
  let monthGridDays: string[] | null = null;
  let monthKeyForGrid = "";
  let monthDays: DayRevenue[] | null = null;

  if (view === "semana") {
    const { days } = weekRange(dateKey);
    const closedWeekdays = await getClosedWeekdays();
    const closedDays = new Set(days.filter((day) => closedWeekdays.has(weekdayOf(day))));
    weekDays = buildDayRevenues(days, movements, closedDays);
  } else if (view === "mes") {
    const { monthKey } = exactMonthRange(dateKey);
    const exactDays = monthDateKeys(monthKey);
    const closedWeekdays = await getClosedWeekdays();
    const closedDays = new Set(exactDays.filter((day) => closedWeekdays.has(weekdayOf(day))));
    monthGridDays = monthRange(dateKey).days;
    monthKeyForGrid = monthKey;
    monthDays = buildDayRevenues(exactDays, movements, closedDays);
  }

  return (
    <div className="space-y-4">
      <CajaToolbar view={view} dateKey={dateKey} title={title} />

      <SummaryCard label={SUMMARY_LABEL[view]} breakdown={breakdown} />

      <div className="hidden grid-cols-1 gap-3 sm:grid-cols-3 md:grid">
        <DesktopSummaryCard label="Total" amount={breakdown.total} />
        <DesktopSummaryCard label="Efectivo" amount={breakdown.byMethod.efectivo} />
        <DesktopSummaryCard label="Transferencia" amount={breakdown.byMethod.transferencia} />
      </div>

      {view === "dia" ? <MovementsList movements={movements} /> : null}
      {weekDays ? <WeekBars days={weekDays} /> : null}
      {monthDays && monthGridDays ? (
        <MonthHeatmap gridDays={monthGridDays} monthKey={monthKeyForGrid} days={monthDays} />
      ) : null}

      <div className="hidden md:block">
        <Card>
          <CardContent className="p-0">
            {movements.length === 0 ? (
              <p className="text-muted-foreground py-10 text-center text-sm">
                Sin movimientos en este período.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Origen</TableHead>
                    <TableHead>Concepto</TableHead>
                    <TableHead>Medio</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.map((movement) => (
                    <TableRow key={`${movement.origin}-${movement.id}`}>
                      <TableCell className="text-muted-foreground">
                        {formatDateTime(movement.at)}
                      </TableCell>
                      <TableCell>{ORIGIN_LABEL[movement.origin]}</TableCell>
                      <TableCell className="whitespace-normal">
                        {movement.serviceName}
                        {movement.note ? (
                          <p className="text-muted-foreground mt-0.5 text-xs">“{movement.note}”</p>
                        ) : null}
                      </TableCell>
                      <TableCell>{METHOD_LABEL[movement.method]}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCurrency(movement.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
