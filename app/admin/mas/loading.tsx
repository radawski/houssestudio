import { MasRows } from "@/app/admin/mas/mas-rows";
import { SessionCardSkeleton } from "@/app/admin/mas/session-card";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Entrar a Más es inmediato: las filas no dependen de datos y se pueden tocar
 * desde el primer cuadro; solo la tarjeta de sesión va en barras. Sin este
 * archivo, con conexión lenta el toque en la pestaña no mostraba nada durante
 * un segundo. Mismo armado que `page.tsx`.
 */
export default function Loading() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Más</h1>
        <p className="text-muted-foreground text-sm">Ajustes del estudio.</p>
      </div>

      <Card className="py-0">
        <CardContent className="divide-y divide-[var(--hs-divider)] p-0">
          <MasRows />
        </CardContent>
      </Card>

      <SessionCardSkeleton />
    </div>
  );
}
