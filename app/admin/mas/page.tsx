import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Clock, Scissors } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { signOut } from "@/lib/actions/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Más" };

const LINKS = [
  {
    href: "/admin/servicios",
    label: "Servicios",
    description: "Catálogo, precios y duración.",
    icon: Scissors,
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
export default async function MasPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Más</h1>
        <p className="text-muted-foreground text-sm">Ajustes del estudio.</p>
      </div>

      <Card className="py-0">
        <CardContent className="divide-border divide-y p-0">
          {LINKS.map(({ href, label, description, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="hover:bg-accent flex h-15 items-center gap-3 px-4 transition-colors"
            >
              <Icon className="text-muted-foreground size-5 shrink-0" strokeWidth={1.75} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{label}</p>
                <p className="text-muted-foreground text-xs">{description}</p>
              </div>
              <ChevronRight className="text-muted-foreground size-4.5 shrink-0" />
            </Link>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{user?.email}</p>
            <p className="text-muted-foreground text-xs">Sesión de administrador</p>
          </div>
          <form action={signOut}>
            <Button variant="ghost" size="sm" type="submit" className="text-destructive">
              Salir
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
