import { BackHeader } from "@/components/admin/back-header";
import { Skeleton } from "@/components/ui/skeleton";
import { StatsSkeleton } from "@/app/admin/estadisticas/stats-toolbar";

/** Entrar a Estadísticas desde Más: el encabezado al toque y los números en barras. */
export default function Loading() {
  return (
    <div className="space-y-4 md:max-w-2xl">
      <div className="space-y-3">
        <BackHeader title="Estadísticas" />
        <h1 className="hidden text-xl font-semibold md:block">Estadísticas</h1>
        <Skeleton className="h-[42px] w-full rounded-md md:max-w-xs" />
        <Skeleton className="h-11 w-full rounded-md md:max-w-md" />
      </div>
      <div role="status" aria-live="polite" className="hs-reveal-bars">
        <span className="sr-only">Cargando las estadísticas…</span>
        <StatsSkeleton />
      </div>
    </div>
  );
}
