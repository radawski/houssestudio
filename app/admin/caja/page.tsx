import type { Metadata } from "next";

import { CajaToolbar, type CajaView } from "@/app/admin/caja/caja-toolbar";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getCashboxSummary } from "@/lib/data/cashbox";
import { dayRange, exactMonthRange, todayKey, weekRange } from "@/lib/dates";
import { formatCurrency, formatDateTime, formatInTz, formatLongDate } from "@/lib/format";

export const metadata: Metadata = { title: "Caja" };

export const dynamic = "force-dynamic";

const VIEWS: CajaView[] = ["dia", "semana", "mes"];
const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const METHOD_LABEL = { efectivo: "Efectivo", transferencia: "Transferencia" } as const;
const ORIGIN_LABEL = { turno: "Turno", venta_suelta: "Venta suelta" } as const;

function SummaryCard({ label, amount }: { label: string; amount: number }) {
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

  return (
    <div className="space-y-4">
      <CajaToolbar view={view} dateKey={dateKey} title={title} />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <SummaryCard label="Total" amount={breakdown.total} />
        <SummaryCard label="Efectivo" amount={breakdown.byMethod.efectivo} />
        <SummaryCard label="Transferencia" amount={breakdown.byMethod.transferencia} />
      </div>

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
                  <TableHead>Servicio</TableHead>
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
                    <TableCell>{movement.serviceName}</TableCell>
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
  );
}
