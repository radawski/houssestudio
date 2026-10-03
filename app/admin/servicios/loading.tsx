import { ServiceDialog } from "@/app/admin/servicios/service-dialog";
import { BackHeader } from "@/components/admin/back-header";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Entrar a Servicios desde Más (diseño "Estados de carga", n-ServiciosCarga):
 * la navegación es inmediata. Lo que no depende de datos es real desde el
 * primer cuadro —el ←, el texto y "Nuevo servicio", que abre la hoja vacía—
 * y las tarjetas van en barras (esperan 200 ms, `.hs-reveal-bars`).
 */
export default function Loading() {
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
        <ServiceDialog />
      </div>

      <div role="status" aria-live="polite" className="hs-reveal-bars">
        <span className="sr-only">Cargando servicios…</span>

        <div className="flex flex-col gap-3 md:hidden">
          {[0, 1, 2].map((index) => (
            <div key={index} className="bg-card space-y-3 rounded-md border border-[var(--hs-border-card)] p-3.5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex h-[22px] items-center">
                    <Skeleton className="h-[15px] w-[132px]" />
                  </div>
                  <div className="mt-0.5 flex h-[18px] items-center">
                    <Skeleton className="h-[13px] w-[214px] max-w-full" />
                  </div>
                </div>
                <div className="flex h-11 w-12 shrink-0 items-center justify-center">
                  <Skeleton className="h-[26px] w-11 rounded-full" />
                </div>
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className="flex gap-2">
                  <Skeleton className="h-7 w-[76px] rounded-full" />
                  <Skeleton className="h-7 w-[62px] rounded-full" />
                </div>
                <div className="flex gap-1.5">
                  <Skeleton className="size-11 rounded-md" />
                  <Skeleton className="size-11 rounded-md" />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="hidden grid-cols-1 gap-3 md:grid">
          {[0, 1, 2].map((index) => (
            <Card key={index}>
              <CardContent className="flex items-center justify-between gap-4 py-4">
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-[132px]" />
                  <Skeleton className="h-3.5 w-[214px]" />
                  <Skeleton className="h-3.5 w-28" />
                </div>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-9 rounded-full" />
                  <Skeleton className="size-8 rounded-md" />
                  <Skeleton className="size-8 rounded-md" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
