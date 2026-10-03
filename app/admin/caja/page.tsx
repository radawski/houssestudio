import type { Metadata } from "next";

import { CajaBody } from "@/app/admin/caja/caja-body";
import { CajaToolbar } from "@/app/admin/caja/caja-toolbar";
import { SummaryCard, SUMMARY_LABEL } from "@/app/admin/caja/caja-views";
import { CategoryCards } from "@/app/admin/caja/category-cards";
import { CategoryTable, DesktopSummary } from "@/app/admin/caja/category-table";
import { PeriodNavigation } from "@/components/admin/period-navigation";
import { groupByCategory } from "@/lib/cashbox";
import { getCashboxSummary } from "@/lib/data/cashbox";
import { dayRange, exactMonthRange, todayKey, weekRange } from "@/lib/dates";
import type { PeriodView } from "@/lib/period-nav";

export const metadata: Metadata = { title: "Caja" };

export const dynamic = "force-dynamic";

const VIEWS: PeriodView[] = ["dia", "semana", "mes"];
const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function rangeFor(view: PeriodView, dateKey: string): { start: Date; end: Date } {
  if (view === "dia") return dayRange(dateKey);
  if (view === "semana") {
    const { start, end } = weekRange(dateKey);
    return { start, end };
  }
  const { start, end } = exactMonthRange(dateKey);
  return { start, end };
}

export default async function CajaPage({ searchParams }: PageProps<"/admin/caja">) {
  const { vista, fecha } = await searchParams;

  const view = VIEWS.includes(vista as PeriodView) ? (vista as PeriodView) : "dia";
  const dateKey =
    typeof fecha === "string" && DATE_KEY_PATTERN.test(fecha) ? fecha : todayKey();

  const range = rangeFor(view, dateKey);
  const { movements, breakdown } = await getCashboxSummary({
    start: range.start.toISOString(),
    end: range.end.toISOString(),
  });

  const groups = groupByCategory(movements);
  const detail = view === "dia" ? "movimientos" : "conceptos";

  return (
    <PeriodNavigation basePath="/admin/caja" view={view} dateKey={dateKey}>
      <div className="space-y-4">
        <CajaToolbar />

        <CajaBody>
          <div className="space-y-4">
            <SummaryCard label={SUMMARY_LABEL[view]} breakdown={breakdown} />

            <DesktopSummary label={SUMMARY_LABEL[view]} breakdown={breakdown} groups={groups} />

            <CategoryCards groups={groups} detail={detail} />
            <CategoryTable groups={groups} breakdown={breakdown} detail={detail} />
          </div>
        </CajaBody>
      </div>
    </PeriodNavigation>
  );
}
