import { redirect } from "next/navigation";
import { LogOut } from "lucide-react";

import { AdminNav } from "@/app/admin/admin-nav";
import { AdminTabBar } from "@/app/admin/admin-tab-bar";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/actions/auth";
import { BUSINESS_NAME } from "@/lib/config";
import { countPendingAppointments } from "@/lib/data/appointments";
import { createClient } from "@/lib/supabase/server";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // El middleware ya exige sesion; aca se verifica ademas que ese usuario este
  // habilitado como administrador. Sin esta comprobacion, cualquier usuario de
  // Supabase Auth veria el chrome del panel (vacio por RLS, pero visible).
  if (!user) redirect("/login");

  const { data: admin } = await supabase
    .from("admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!admin) {
    return (
      <main className="flex flex-1 items-center justify-center p-6">
        <div className="max-w-md space-y-4 text-center">
          <h1 className="text-lg font-semibold">Cuenta sin permisos</h1>
          <p className="text-muted-foreground text-sm">
            Tu usuario existe pero no está habilitado como administrador. Agregá su
            id a la tabla <code className="font-mono">admins</code> desde el panel de
            Supabase.
          </p>
          <p className="text-muted-foreground font-mono text-xs break-all">{user.id}</p>
          <form action={signOut}>
            <Button variant="outline" type="submit">
              Cerrar sesión
            </Button>
          </form>
        </div>
      </main>
    );
  }

  const pendingCount = await countPendingAppointments();

  return (
    // En mobile el shell ocupa exactamente el viewport y es `main` el que
    // scrollea (design/admin-iphone n-sistema: header y tab bar fijos, "main
    // ... scroll propio"). En desktop no hay tab bar que se superponga, así
    // que se conserva el scroll de documento de siempre.
    <div className="flex h-dvh flex-col overflow-hidden md:h-auto md:min-h-full md:flex-1 md:overflow-visible">
      <header className="bg-popover shrink-0 border-b md:sticky md:top-0 md:z-20">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 px-4">
          <span className="text-sm font-semibold tracking-widest">{BUSINESS_NAME}</span>
          <form action={signOut}>
            <Button variant="ghost" size="sm" type="submit">
              <LogOut className="size-4" />
              <span className="sr-only sm:not-sr-only">Salir</span>
            </Button>
          </form>
        </div>
        <div className="mx-auto hidden w-full max-w-6xl px-2 pb-2 md:block">
          <AdminNav pendingCount={pendingCount} />
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 overflow-y-auto p-4 md:overflow-visible">
        {children}
      </main>

      <AdminTabBar pendingCount={pendingCount} />
    </div>
  );
}
