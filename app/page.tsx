import { BookingStepper } from "@/components/public/booking-stepper";
import { SiteHero } from "@/components/public/site-hero";
import { BOOKING_HORIZON_DAYS } from "@/lib/config";
import { getBusinessHours } from "@/lib/data/availability";
import { createAdminClient } from "@/lib/supabase/admin";

// La disponibilidad cambia con cada reserva, así que la página no se cachea.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = createAdminClient();

  const [servicesResult, hours] = await Promise.all([
    supabase
      .from("services")
      .select("*")
      .eq("is_active", true)
      .order("sort_order")
      .order("name"),
    getBusinessHours(),
  ]);

  if (servicesResult.error) {
    throw new Error(`No se pudieron leer los servicios: ${servicesResult.error.message}`);
  }

  // Los días sin atención se muestran deshabilitados en el calendario, para que
  // el cliente no tenga que descubrirlos a base de tocar y no ver horarios.
  const closedWeekdays = hours.filter((h) => h.is_closed).map((h) => h.weekday);

  return (
    <main className="flex flex-1 flex-col">
      <SiteHero />
      <BookingStepper
        services={servicesResult.data}
        closedWeekdays={closedWeekdays}
        horizonDays={BOOKING_HORIZON_DAYS}
      />
    </main>
  );
}
