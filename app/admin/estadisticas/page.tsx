import type { Metadata } from "next";

import { SameDayCard } from "@/app/admin/estadisticas/same-day-card";
import {
  ClientsSection,
  MovementSection,
  OutcomesSection,
  RevenueSection,
} from "@/app/admin/estadisticas/stats-sections";
import { StatsBody, StatsToolbar } from "@/app/admin/estadisticas/stats-toolbar";
import { PeriodNavigation } from "@/components/admin/period-navigation";
import { getStats, type StatsView } from "@/lib/data/stats";
import { todayKey } from "@/lib/dates";

export const metadata: Metadata = { title: "Estadísticas" };

export const dynamic = "force-dynamic";

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Estadísticas (plan de noviembre, E1; prototipo Estadisticas): ingresos,
 * turnos, clientes, el mismo día semana a semana y el movimiento por día y
 * hora, por semana o por mes. Arranca en el mes de hoy.
 */
export default async function StatsPage({ searchParams }: PageProps<"/admin/estadisticas">) {
  const { vista, fecha } = await searchParams;
  const view: StatsView = vista === "semana" ? "semana" : "mes";
  const today = todayKey();
  // Del futuro no hay nada que mostrar: una fecha posterior a hoy cae en hoy.
  const dateKey = typeof fecha === "string" && DATE_KEY_PATTERN.test(fecha) && fecha <= today ? fecha : today;

  const stats = await getStats(view, dateKey);

  return (
    <PeriodNavigation basePath="/admin/estadisticas" view={view} dateKey={dateKey}>
      <div className="space-y-4 md:max-w-2xl">
        <StatsToolbar />
        <StatsBody>
          <div className="space-y-4">
            <RevenueSection stats={stats} />
            <OutcomesSection stats={stats} />
            <ClientsSection stats={stats} />
            <SameDayCard
              anchorKey={stats.sameDay.anchorKey}
              revenue={stats.sameDay.revenue}
              visits={stats.sameDay.visits}
            />
            <MovementSection stats={stats} />
          </div>
        </StatsBody>
      </div>
    </PeriodNavigation>
  );
}
