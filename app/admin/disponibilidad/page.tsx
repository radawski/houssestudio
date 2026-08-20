import type { Metadata } from "next";

import { BusinessHoursForm } from "@/app/admin/disponibilidad/business-hours-form";
import { TimeBlockForm, TimeBlockList } from "@/app/admin/disponibilidad/time-blocks";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { dayRange, todayKey } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Disponibilidad" };

export default async function AvailabilityPage() {
  const today = todayKey();
  const supabase = await createClient();

  const [hoursResult, blocksResult] = await Promise.all([
    supabase.from("business_hours").select("*").order("weekday"),
    supabase
      .from("time_blocks")
      .select("*")
      // Los bloqueos ya vencidos no aportan nada operativamente.
      .gte("ends_at", dayRange(today).start.toISOString())
      .order("starts_at"),
  ]);

  if (hoursResult.error) {
    throw new Error(`No se pudieron leer los horarios: ${hoursResult.error.message}`);
  }
  if (blocksResult.error) {
    throw new Error(`No se pudieron leer los bloqueos: ${blocksResult.error.message}`);
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Disponibilidad</h1>
        <p className="text-muted-foreground text-sm">
          Horario semanal y excepciones puntuales.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Horario semanal</CardTitle>
          <CardDescription>
            Define la franja en la que se generan turnos cada día de la semana.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BusinessHoursForm hours={hoursResult.data} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Bloquear un rango</CardTitle>
          <CardDescription>
            Almuerzos, trámites, feriados o imprevistos. El rango deja de ofrecerse
            en el portal público.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TimeBlockForm todayKey={today} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Bloqueos próximos</CardTitle>
        </CardHeader>
        <CardContent>
          <TimeBlockList blocks={blocksResult.data} />
        </CardContent>
      </Card>
    </div>
  );
}
