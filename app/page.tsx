import { BookingStepper } from "@/components/public/booking-stepper";
import { SiteHero } from "@/components/public/site-hero";
import { getSettings } from "@/lib/data/availability";
import { createAdminClient } from "@/lib/supabase/admin";

// La disponibilidad cambia con cada reserva, así que la página no se cachea.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = createAdminClient();

  const [servicesResult, settings] = await Promise.all([
    supabase
      .from("services")
      .select("*")
      .eq("is_active", true)
      .order("sort_order")
      .order("name"),
    getSettings(),
  ]);

  if (servicesResult.error) {
    throw new Error(`No se pudieron leer los servicios: ${servicesResult.error.message}`);
  }

  return (
    <main className="flex flex-1 flex-col">
      <SiteHero />
      <BookingStepper
        services={servicesResult.data}
        horizonDays={settings.max_booking_days}
        businessWhatsapp={settings.phone}
      />
    </main>
  );
}
