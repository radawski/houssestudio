import type { Metadata } from "next";

import { BookingWindowForm } from "@/app/admin/disponibilidad/booking-window-form";
import { BusinessHoursForm } from "@/app/admin/disponibilidad/business-hours-form";
import { BookingWindowSheet, TimeBlockSheet } from "@/app/admin/disponibilidad/mobile-sheets";
import { TimeBlockForm, TimeBlockList } from "@/app/admin/disponibilidad/time-blocks";
import { WeeklyHoursMobile } from "@/app/admin/disponibilidad/weekly-hours-mobile";
import { BackHeader } from "@/components/admin/back-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchBusinessDays, getSettings } from "@/lib/data/availability";
import { dayRange, todayKey } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Disponibilidad" };

export default async function AvailabilityPage() {
  const today = todayKey();
  const supabase = await createClient();

  const [days, blocksResult, settings] = await Promise.all([
    fetchBusinessDays(supabase),
    supabase
      .from("time_blocks")
      .select("*")
      // Los bloqueos ya vencidos no aportan nada operativamente.
      .gte("ends_at", dayRange(today).start.toISOString())
      .order("starts_at"),
    getSettings(),
  ]);

  if (blocksResult.error) {
    throw new Error(`No se pudieron leer los bloqueos: ${blocksResult.error.message}`);
  }

  return (
    <>
      {/* Mobile (design/admin-iphone n-Disponibilidad): tres bloques en vez de
        veinte inputs apilados. Todo guarda al instante, así que no hay barra
        de cambios pendientes (decisión del usuario). */}
      <div className="flex flex-col gap-3.5 md:hidden">
        <BackHeader title="Disponibilidad" />
        <BookingWindowSheet
          maxBookingDays={settings.max_booking_days}
          minLeadMinutes={settings.min_booking_lead_minutes}
        />
        <section className="space-y-2">
          <h2 className="text-muted-foreground text-[11px] font-medium tracking-[0.12em] uppercase">
            Horario semanal
          </h2>
          <WeeklyHoursMobile days={days} />
        </section>
        <section className="space-y-2">
          <h2 className="text-muted-foreground text-[11px] font-medium tracking-[0.12em] uppercase">
            Bloqueos
          </h2>
          <TimeBlockSheet todayKey={today} />
          <div className="bg-card rounded-md border border-[var(--hs-border-card)] px-3.5">
            <TimeBlockList blocks={blocksResult.data} />
          </div>
        </section>
      </div>

      <div className="hidden space-y-4 md:block">
        <div>
          <h1 className="text-xl font-semibold">Disponibilidad</h1>
          <p className="text-muted-foreground text-sm">Horario semanal y excepciones puntuales.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ventana de reserva</CardTitle>
            <CardDescription>
              Con cuánta anticipación se puede pedir un turno. Cambiarlo no afecta a los turnos ya
              tomados.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BookingWindowForm
              maxBookingDays={settings.max_booking_days}
              minLeadMinutes={settings.min_booking_lead_minutes}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Horario semanal</CardTitle>
            <CardDescription>
              Los bloques en los que se generan turnos cada día de la semana. Para cortar al
              mediodía, agregá un segundo bloque.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BusinessHoursForm days={days} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Bloquear un rango</CardTitle>
            <CardDescription>
              Almuerzos, trámites, feriados o imprevistos. El rango deja de ofrecerse en el portal
              público.
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
    </>
  );
}
