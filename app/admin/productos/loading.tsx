import { ChevronRight, Plus } from "lucide-react";

import { CategoryDialog } from "@/app/admin/productos/product-dialogs";
import { BackHeader } from "@/components/admin/back-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const CARD = "bg-card rounded-md border border-[var(--hs-border-card)]";

/**
 * Entrar a Productos desde Más (diseño "Estados de carga", n-ProductosCarga):
 * el ←, el texto y "Nueva categoría" (abre su hoja sin datos) son reales; la
 * lista de categorías va en barras, con el chevron en mist hasta que la fila
 * se pueda tocar.
 */
export default function Loading() {
  return (
    <div role="status" aria-live="polite" className="hs-reveal-bars">
      <span className="sr-only">Cargando categorías…</span>

      <div className="flex flex-col gap-3.5 md:hidden">
        <BackHeader title="Productos" />
        <p className="text-muted-foreground text-[13px]">Elegí una categoría para ver y agregar productos.</p>
        <div className={`${CARD} divide-y divide-[var(--hs-divider)]`}>
          {[0, 1, 2, 3].map((index) => (
            <div key={index} className="flex h-15 items-center gap-3 px-4">
              <div className="min-w-0 flex-1">
                <div className="flex h-[22px] items-center">
                  <Skeleton className="h-[15px] w-[124px]" />
                </div>
                <div className="flex h-4 items-center">
                  <Skeleton className="h-3 w-[72px]" />
                </div>
              </div>
              <ChevronRight className="size-4.5 shrink-0 text-[var(--hs-mist)]" />
            </div>
          ))}
        </div>
        <CategoryDialog>
          <Button variant="outline" size="touch" className="w-full">
            <Plus className="size-4" />
            Nueva categoría
          </Button>
        </CategoryDialog>
      </div>

      <div className="hidden space-y-4 md:block">
        <div>
          <h1 className="text-xl font-semibold">Productos</h1>
          <p className="text-muted-foreground text-sm">Lo que se vende en caja además de los servicios.</p>
        </div>
        <div className="grid grid-cols-[17rem_minmax(0,1fr)] items-start gap-4">
          <section className={`${CARD} p-2`}>
            <p className="text-muted-foreground px-2 pt-1 pb-2 text-[11px] font-medium tracking-[0.12em] uppercase">
              Categorías
            </p>
            <div className="flex flex-col gap-0.5">
              {[0, 1, 2, 3].map((index) => (
                <div key={index} className="flex h-10 items-center justify-between px-2.5">
                  <Skeleton className="h-3.5 w-28" />
                  <Skeleton className="h-3.5 w-4" />
                </div>
              ))}
            </div>
            <CategoryDialog>
              <Button variant="outline" size="sm" className="mt-2 w-full">
                <Plus className="size-4" />
                Nueva categoría
              </Button>
            </CategoryDialog>
          </section>
          <section className={`${CARD} space-y-4 p-5`}>
            <div className="space-y-1.5">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-3.5 w-20" />
            </div>
            <Skeleton className="h-9 w-full rounded-md" />
            {[0, 1, 2].map((index) => (
              <div key={index} className="flex items-center justify-between">
                <Skeleton className="h-3.5 w-40" />
                <Skeleton className="h-3.5 w-16" />
              </div>
            ))}
          </section>
        </div>
      </div>
    </div>
  );
}
