import type { Metadata } from "next";

import { CajaToolbar, type CajaView } from "@/app/admin/caja/caja-toolbar";
import { SummaryCard } from "@/app/admin/caja/caja-views";
import { CategoryCards } from "@/app/admin/caja/category-cards";
import { CategoryTable, DesktopSummary } from "@/app/admin/caja/category-table";
import { groupByCategory } from "@/lib/cashbox";
import { getCashboxSummary } from "@/lib/data/cashbox";
import { dayRange, exactMonthRange, todayKey, weekRange } from "@/lib/dates";
import { formatInTz, formatLongDate } from "@/lib/format";

export const metadata: Metadata = { title: "Caja" };

export const dynamic = "force-dynamic";

const VIEWS: CajaView[] = ["dia", "semana", "mes"];
const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const SUMMARY_LABEL: Record<CajaView, string> = {
  dia: "Total del día",
  semana: "Total de la semana",
  mes: "Total del mes",
};

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

  const groups = groupByCategory(movements);

  return (
    <div className="space-y-4">
      <CajaToolbar view={view} dateKey={dateKey} title={title} />

      <SummaryCard label={SUMMARY_LABEL[view]} breakdown={breakdown} />

      <DesktopSummary label={SUMMARY_LABEL[view]} breakdown={breakdown} groups={groups} />

      <CategoryCards groups={groups} detail={view === "dia" ? "movimientos" : "conceptos"} />
      <CategoryTable
        groups={groups}
        breakdown={breakdown}
        detail={view === "dia" ? "movimientos" : "conceptos"}
      />
    </div>
  );
}
