import { BookingStepper } from "@/components/public/booking-stepper";
import { SiteHero } from "@/components/public/site-hero";
import { BOOKING_HORIZON_DAYS } from "@/lib/config";
import { createAdminClient } from "@/lib/supabase/admin";

// La disponibilidad cambia con cada reserva, así que la página no se cachea.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = createAdminClient();

  const servicesResult = await supabase
    .from("services")
    .select("*")
    .eq("is_active", true)
    .order("sort_order")
    .order("name");

  if (servicesResult.error) {
    throw new Error(`No se pudieron leer los servicios: ${servicesResult.error.message}`);
  }

  return (
    <main className="flex flex-1 flex-col">
      <SiteHero />
      <BookingStepper
        services={servicesResult.data}
        horizonDays={BOOKING_HORIZON_DAYS}
      />
    </main>
  );
}
