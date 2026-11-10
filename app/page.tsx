import type { Metadata } from "next";

import { BookingLanding } from "@/components/public/booking-landing";
import { BookingStepper } from "@/components/public/booking-stepper";
import { BusinessInfo } from "@/components/public/business-info";
import { SiteHero } from "@/components/public/site-hero";
import { WhatsappFab } from "@/components/public/whatsapp-fab";
import { buildBusinessJsonLd, groupOpeningHours } from "@/lib/business-info";
import { siteUrl } from "@/lib/config";
import { fetchBusinessDays, getSettings } from "@/lib/data/availability";
import { toWhatsappNumber } from "@/lib/phone";
import { createAdminClient } from "@/lib/supabase/admin";

// La portada solo muestra servicios, ajustes y el horario semanal: los horarios
// libres los pide el stepper con Server Actions, que nunca se cachean. Por eso
// se sirve cacheada y se regenera cuando el panel cambia un servicio
// (`lib/actions/services.ts`), la ventana de reserva (`lib/actions/settings.ts`)
// o el horario (`lib/actions/availability.ts`). La hora es la red de
// seguridad para lo que se edite directo en Supabase, como el teléfono.
export const revalidate = 3600;

// El canonical va acá y no en el layout: puesto en la raíz, lo heredarían
// "Mis turnos" y el resto, y le dirían a Google que son copias de la portada.
export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default async function HomePage() {
  const supabase = createAdminClient();

  const [servicesResult, settings, businessDays] = await Promise.all([
    supabase
      .from("services")
      .select("*")
      .eq("is_active", true)
      .order("sort_order")
      .order("name"),
    getSettings(),
    fetchBusinessDays(supabase),
  ]);

  if (servicesResult.error) {
    throw new Error(`No se pudieron leer los servicios: ${servicesResult.error.message}`);
  }

  // Sin teléfono cargado (o con uno ilegible) no hay botón de WhatsApp.
  const whatsappNumber = settings.phone ? toWhatsappNumber(settings.phone) : null;

  const hoursGroups = groupOpeningHours(businessDays);
  const jsonLd = buildBusinessJsonLd({
    siteUrl: siteUrl(),
    groups: hoursGroups,
    services: servicesResult.data,
    whatsappNumber,
  });

  return (
    <main className="flex flex-1 flex-col">
      {/* Fuera de `BookingLanding`: la portada se desmonta al bajar, y los datos
          estructurados tienen que estar siempre en el HTML. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <BookingLanding hero={<SiteHero />}>
        <BookingStepper
          services={servicesResult.data}
          horizonDays={settings.max_booking_days}
          businessWhatsapp={settings.phone}
        />
        {whatsappNumber ? <WhatsappFab href={`https://wa.me/${whatsappNumber}`} /> : null}
      </BookingLanding>
      <BusinessInfo groups={hoursGroups} hasWhatsapp={whatsappNumber !== null} />
    </main>
  );
}
