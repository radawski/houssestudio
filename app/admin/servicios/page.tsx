import type { Metadata } from "next";
import { Scissors } from "lucide-react";

import { ServiceDialog } from "@/app/admin/servicios/service-dialog";
import {
  ServiceDeleteButton,
  ServiceVisibilityToggle,
} from "@/app/admin/servicios/service-row-actions";
import { BackHeader } from "@/components/admin/back-header";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, formatDuration } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { Service } from "@/lib/supabase/database.types";

export const metadata: Metadata = { title: "Servicios" };

const CHIP = "inline-flex h-7 items-center rounded-full border border-[var(--hs-border-card)] px-3 text-xs tabular-nums";

/**
 * Tarjeta mobile (design/admin-iphone n-Servicios): nombre y descripción con
 * el switch de visibilidad a la derecha; abajo, chips de precio y duración y
 * las acciones de editar y eliminar. Un servicio oculto solo cambia el switch.
 */
function ServiceCardMobile({ service }: { service: Service }) {
  return (
    <div className="bg-card space-y-3 rounded-md border border-[var(--hs-border-card)] p-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[15px] font-semibold">{service.name}</p>
          {service.description ? (
            <p className="text-muted-foreground mt-0.5 text-[13px] leading-[1.35]">
              {service.description}
            </p>
          ) : null}
        </div>
        <div className="flex h-11 w-12 shrink-0 items-center justify-center">
          <ServiceVisibilityToggle service={service} size="lg" />
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <span className={`${CHIP} text-foreground font-medium`}>
            {formatCurrency(service.price)}
          </span>
          <span className={`${CHIP} text-muted-foreground`}>
            {formatDuration(service.duration_minutes)}
          </span>
        </div>
        <div className="flex shrink-0 items-center">
          <ServiceDialog service={service} />
          <ServiceDeleteButton service={service} />
        </div>
      </div>
    </div>
  );
}

export default async function ServicesPage() {
  const supabase = await createClient();
  const { data: services, error } = await supabase
    .from("services")
    .select("*")
    .order("sort_order")
    .order("name");

  if (error) throw new Error(`No se pudieron leer los servicios: ${error.message}`);

  return (
    <div className="space-y-3.5 md:space-y-4">
      <BackHeader title="Servicios" />

      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="hidden text-xl font-semibold md:block">Servicios</h1>
          <p className="text-muted-foreground text-[13px] md:text-sm">
            Precio y duración de cada servicio del catálogo.
          </p>
        </div>
        {services.length > 0 ? <ServiceDialog /> : null}
      </div>

      {services.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center text-sm">
            <Scissors className="text-muted-foreground size-6" strokeWidth={1.75} />
            <p className="font-medium">Todavía no hay servicios cargados.</p>
            <p className="text-muted-foreground">
              Sin servicios activos el portal público no puede tomar reservas.
            </p>
            <div className="pt-2">
              <ServiceDialog trigger="empty" />
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex flex-col gap-3 md:hidden">
            {services.map((service) => (
              <ServiceCardMobile key={service.id} service={service} />
            ))}
          </div>

          <div className="hidden grid-cols-1 gap-3 md:grid">
            {services.map((service) => (
              <Card key={service.id}>
                <CardContent className="flex flex-wrap items-center justify-between gap-4 py-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{service.name}</p>
                    {service.description ? (
                      <p className="text-muted-foreground text-sm">{service.description}</p>
                    ) : null}
                    <p className="text-muted-foreground mt-1 text-sm tabular-nums">
                      {formatCurrency(service.price)} · {formatDuration(service.duration_minutes)}
                    </p>
                  </div>

                  <div className="flex items-center gap-1">
                    <ServiceVisibilityToggle service={service} />
                    <ServiceDialog service={service} />
                    <ServiceDeleteButton service={service} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
