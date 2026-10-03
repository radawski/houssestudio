import { CajaSkeletonBody } from "@/app/admin/caja/caja-body";
import { ToolbarSkeleton } from "@/components/admin/loading-skeletons";

/**
 * Entrada a Caja desde la barra de pestañas: toolbar en barras y el mismo
 * cuerpo de carga que al cambiar de fecha (tarjetas de categoría, no filas de
 * movimientos).
 */
export default function Loading() {
  return (
    <div role="status" aria-live="polite" className="space-y-4">
      <span className="sr-only">Cargando la caja…</span>
      <ToolbarSkeleton />
      <CajaSkeletonBody view="dia" />
    </div>
  );
}
