import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Esqueletos de carga de las pestañas del panel (design/admin-iphone
 * n-estados / n-CargaHoy). El header y la tab bar viven en el layout y se
 * pintan enseguida: esto reemplaza solo el contenido de `main`.
 *
 * Cada forma copia la del contenido real en el celular (alturas, radios,
 * separaciones), para que la pantalla no salte al llegar los datos. Si una
 * pantalla cambia, su esqueleto tiene que cambiar con ella.
 */

const CARD = "bg-card rounded-md border border-[var(--hs-border-card)]";

function LoadingRegion({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

/**
 * Tarjeta de turno de Hoy, sobre el mismo `Card` que `AppointmentCard`:
 * rango + badge, cliente, datos y fila de acciones. Cada barra va dentro de
 * una caja con el alto de línea del texto real.
 */
function AppointmentCardSkeleton() {
  return (
    <Card>
      <CardContent className="space-y-3 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex h-6 items-center">
              <Skeleton className="h-[15px] w-24" />
            </div>
            <div className="flex h-5 items-center">
              <Skeleton className="h-3 w-[182px]" />
            </div>
          </div>
          <Skeleton className="h-[22px] w-[88px] rounded-full" />
        </div>
        <div className="flex h-5 items-center">
          <Skeleton className="h-3.5 w-[140px]" />
        </div>
        <div className="flex gap-2 pt-1">
          <Skeleton className="h-11 flex-1 rounded-md" />
          <Skeleton className="h-11 flex-1 rounded-md" />
        </div>
      </CardContent>
    </Card>
  );
}

export function HoySkeleton() {
  return (
    <LoadingRegion label="Cargando tu día…">
      <div className="space-y-6">
        <div>
          <div className="flex h-7 items-center">
            <Skeleton className="h-[21px] w-[232px]" />
          </div>
          <div className="flex h-5 items-center">
            <Skeleton className="h-[13px] w-32" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
            <Card key={i}>
              <CardContent className="py-4">
                <div className="flex h-4 items-center">
                  <Skeleton className="h-[9px] w-16 max-w-full" />
                </div>
                <div className="mt-1 flex h-8 items-center">
                  <Skeleton className="h-5 w-[22px]" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <section className="space-y-3">
          {/* Encabezado real, no una barra (n-CargaHoy). */}
          <h2 className="text-muted-foreground text-xs font-medium tracking-widest uppercase">
            Agenda del día
          </h2>
          <div className="grid grid-cols-1 gap-3">
            {[0, 1, 2].map((i) => (
              <AppointmentCardSkeleton key={i} />
            ))}
          </div>
        </section>
      </div>
    </LoadingRegion>
  );
}

/** Flechas, título y segmentado Día/Semana/Mes: la misma barra en Agenda y Caja. */
function ToolbarSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-1.5">
        <Skeleton className="size-11 rounded-md" />
        <Skeleton className="size-11 rounded-md" />
        <Skeleton className="ml-1 h-5 w-44" />
      </div>
      <Skeleton className="h-9 w-full rounded-md" />
    </div>
  );
}

export function AgendaSkeleton() {
  return (
    <LoadingRegion label="Cargando la agenda…">
      <div className="space-y-4">
        <ToolbarSkeleton />
        <div className="flex gap-1.5 md:hidden">
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-14 flex-1 rounded-md" />
          ))}
        </div>
        <div className="flex flex-col gap-2.5">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex gap-2.5">
              <Skeleton className="mt-0.5 h-[13px] w-11 shrink-0" />
              <Skeleton className={i % 2 ? "h-11 flex-1 rounded-md" : "h-[88px] flex-1 rounded-md"} />
            </div>
          ))}
        </div>
      </div>
    </LoadingRegion>
  );
}

export function SolicitudesSkeleton() {
  return (
    <LoadingRegion label="Cargando solicitudes…">
      <div className="space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-3.5 w-full max-w-80" />
          <Skeleton className="h-3.5 w-48" />
        </div>
        {[0, 1].map((i) => (
          <div key={i} className={`${CARD} space-y-3 p-3.5`}>
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <Skeleton className="h-[13px] w-40" />
                <Skeleton className="h-4 w-28" />
              </div>
              <Skeleton className="h-[22px] w-[88px] rounded-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-[15px] w-36" />
              <Skeleton className="h-[13px] w-44" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-[30px] w-32 rounded-full" />
              <Skeleton className="h-[30px] w-32 rounded-full" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-11 flex-1 rounded-md" />
              <Skeleton className="h-11 flex-1 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </LoadingRegion>
  );
}

export function CajaSkeleton() {
  return (
    <LoadingRegion label="Cargando la caja…">
      <div className="space-y-4">
        <ToolbarSkeleton />
        <div className={`${CARD} space-y-3 p-4`}>
          <div className="flex items-center justify-between">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-7 w-24" />
          </div>
          <div className="flex justify-between border-t border-[var(--hs-divider)] pt-3">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className={`${CARD} divide-y divide-[var(--hs-divider)]`}>
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center justify-between px-3.5 py-3">
              <div className="space-y-1.5">
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="h-3 w-20" />
              </div>
              <div className="flex flex-col items-end space-y-1.5">
                <Skeleton className="h-[15px] w-16" />
                <Skeleton className="h-3 w-12" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </LoadingRegion>
  );
}
