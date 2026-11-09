import { BackHeader } from "@/components/admin/back-header";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Entrar a Clientes desde Más: la navegación es inmediata y la lista llega en
 * barras con la forma de las filas (`.hs-reveal-bars`, n-estados).
 */
export default function Loading() {
  return (
    <div className="space-y-3.5 md:space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <BackHeader title="Clientes" />
          <h1 className="hidden text-xl font-semibold md:block">Clientes</h1>
        </div>
      </div>

      <div role="status" aria-live="polite" className="hs-reveal-bars space-y-3.5">
        <span className="sr-only">Cargando clientes…</span>
        <Skeleton className="h-12 w-full rounded-md" />
        <div className="bg-card divide-y divide-[var(--hs-divider)] rounded-md border border-[var(--hs-border-card)]">
          {[0, 1, 2, 3, 4].map((index) => (
            <div key={index} className="flex h-[68px] items-center gap-3 px-3.5">
              <Skeleton className="size-9 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-[15px] w-40" />
                <Skeleton className="h-[13px] w-52 max-w-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
