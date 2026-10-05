import { BookingLanding } from "@/components/public/booking-landing";
import { BookingStepper } from "@/components/public/booking-stepper";
import { SiteHero } from "@/components/public/site-hero";
import { WhatsappFab } from "@/components/public/whatsapp-fab";
import { getSettings } from "@/lib/data/availability";
import { toWhatsappNumber } from "@/lib/phone";
import { createAdminClient } from "@/lib/supabase/admin";

// La portada solo muestra servicios y ajustes: los horarios libres los pide el
// stepper con Server Actions, que nunca se cachean. Por eso se sirve cacheada y
// se regenera cuando el panel cambia un servicio (`lib/actions/services.ts`) o
// la ventana de reserva (`lib/actions/settings.ts`). La hora es la red de
// seguridad para lo que se edite directo en Supabase, como el teléfono.
export const revalidate = 3600;

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

  // Sin teléfono cargado (o con uno ilegible) no hay botón de WhatsApp.
  const whatsappNumber = settings.phone ? toWhatsappNumber(settings.phone) : null;

  return (
    <main className="flex flex-1 flex-col">
      <BookingLanding hero={<SiteHero />}>
        <BookingStepper
          services={servicesResult.data}
          horizonDays={settings.max_booking_days}
          businessWhatsapp={settings.phone}
        />
        {whatsappNumber ? <WhatsappFab href={`https://wa.me/${whatsappNumber}`} /> : null}
      </BookingLanding>
    </main>
  );
}
