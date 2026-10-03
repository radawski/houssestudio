import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ChevronRight, Clock, Package, Scissors } from "lucide-react";

import { AddCustomerSheet } from "@/app/admin/mas/add-customer-sheet";
import { SessionCard, SessionCardSkeleton } from "@/app/admin/mas/session-card";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "Más" };

const LINKS = [
  {
    href: "/admin/servicios",
    label: "Servicios",
    description: "Catálogo, precios y duración.",
    icon: Scissors,
  },
  {
    href: "/admin/productos",
    label: "Productos",
    description: "Categorías, productos y precios.",
    icon: Package,
    isNew: true,
  },
  {
    href: "/admin/disponibilidad",
    label: "Disponibilidad",
    description: "Horario semanal y bloqueos.",
    icon: Clock,
  },
] as const;

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
          {LINKS.map(({ href, label, description, icon: Icon, ...link }) => (
            <Link
              key={href}
              href={href}
              className="hover:bg-accent flex h-15 items-center gap-3 px-4 transition-colors"
            >
              <Icon className="text-muted-foreground size-5 shrink-0" strokeWidth={1.75} />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-sm font-medium">
                  {label}
                  {"isNew" in link && link.isNew ? (
                    <span className="rounded-full border border-[var(--hs-border-card)] px-1.5 text-[10px] font-medium tracking-[0.08em] text-muted-foreground uppercase">
                      Nuevo
                    </span>
                  ) : null}
                </p>
                <p className="text-muted-foreground text-xs">{description}</p>
              </div>
              <ChevronRight className="text-muted-foreground size-4.5 shrink-0" />
            </Link>
          ))}
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
