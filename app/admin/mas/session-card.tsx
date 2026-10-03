import { redirect } from "next/navigation";

import { SessionError } from "@/app/admin/mas/session-error";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { signOut } from "@/lib/actions/auth";
import { formatTime } from "@/lib/format";
import { classifySession } from "@/lib/session-state";
import { createClient } from "@/lib/supabase/server";

/**
 * Tarjeta de sesión de Más. Es lo único de la pantalla que pide algo
 * (`getUser`), así que va sola dentro de un `Suspense`: el título y las filas
 * se pintan y se pueden tocar enseguida (diseño "Estados de carga",
 * n-MasCarga), y si el pedido falla el error queda acá adentro (n-MasError).
 */
export async function SessionCard() {
  let result: { user: { email?: string } | null; error: unknown };
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUser();
    result = { user: data.user, error };
  } catch (error) {
    result = { user: null, error };
  }

  const session = classifySession(result);
  if (session.kind === "expired") redirect("/login");
  if (session.kind === "error") {
    return <SessionError reason={session.reason} at={formatTime(new Date())} />;
  }

  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{session.email}</p>
          <p className="text-muted-foreground text-xs">Sesión de administrador</p>
        </div>
        <form action={signOut}>
          <Button variant="ghost" size="sm" type="submit" className="text-destructive">
            Salir
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

/**
 * Mientras llega la sesión: el mail en barra, "Sesión de administrador" real
 * y el botón Salir como bloque. Las barras esperan 200 ms (`.hs-reveal-bars`).
 */
export function SessionCardSkeleton() {
  return (
    <div role="status" aria-live="polite" className="hs-reveal-bars">
      <span className="sr-only">Cargando tu sesión…</span>
      <Card>
        <CardContent className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex h-5 items-center">
              <Skeleton className="h-3.5 w-52 max-w-full" />
            </div>
            <p className="text-muted-foreground text-xs">Sesión de administrador</p>
          </div>
          <Skeleton className="h-8 w-14 rounded-md" />
        </CardContent>
      </Card>
    </div>
  );
}
