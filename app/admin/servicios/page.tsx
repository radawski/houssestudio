import type { Metadata } from "next";

import { ServiceDialog } from "@/app/admin/servicios/service-dialog";
import {
  ServiceDeleteButton,
  ServiceVisibilityToggle,
} from "@/app/admin/servicios/service-row-actions";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, formatDuration } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Servicios" };

export default async function ServicesPage() {
  const supabase = await createClient();
  const { data: services, error } = await supabase
    .from("services")
    .select("*")
    .order("sort_order")
    .order("name");

  if (error) throw new Error(`No se pudieron leer los servicios: ${error.message}`);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Servicios</h1>
          <p className="text-muted-foreground text-sm">
            Precio y duración de cada servicio del catálogo.
          </p>
        </div>
        <ServiceDialog />
      </div>

      {services.length === 0 ? (
        <Card>
          <CardContent className="text-muted-foreground py-10 text-center text-sm">
            Todavía no hay servicios cargados.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
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
      )}
    </div>
  );
}
