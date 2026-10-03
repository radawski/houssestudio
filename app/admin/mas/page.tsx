import type { Metadata } from "next";
import { Suspense } from "react";

import { AddCustomerSheet } from "@/app/admin/mas/add-customer-sheet";
import { MasRows } from "@/app/admin/mas/mas-rows";
import { SessionCard, SessionCardSkeleton } from "@/app/admin/mas/session-card";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "Más" };

/**
 * Ajustes del estudio (design/admin-iphone n-Mas).
 *
 * Existe porque seis pestañas no entran en una tab bar inferior: Servicios y
 * Disponibilidad, que se tocan poco, cuelgan de acá en vez de tener ítem
 * propio.
 */
export default function MasPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Más</h1>
        <p className="text-muted-foreground text-sm">Ajustes del estudio.</p>
      </div>

      <Card className="py-0">
        <CardContent className="divide-y divide-[var(--hs-divider)] p-0">
          <MasRows />
          <AddCustomerSheet />
        </CardContent>
      </Card>

      {/* Lo único que pide algo es la sesión: el resto se pinta y se puede
          tocar enseguida, y si el pedido falla el error queda en su tarjeta. */}
      <Suspense fallback={<SessionCardSkeleton />}>
        <SessionCard />
      </Suspense>
    </div>
  );
}
