"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Home, Inbox, MoreHorizontal, Wallet } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Tab bar inferior, solo mobile (design/admin-iphone n-sistema). Convive con
 * `AdminNav`, que sigue siendo la navegación en desktop — no la reemplaza.
 *
 * Servicios y Disponibilidad no tienen ítem propio: seis pestañas no entran
 * en una barra inferior, así que cuelgan de "Más" y esa pestaña queda
 * activa mientras se navega dentro de cualquiera de las dos.
 */
const LINKS = [
  { href: "/admin", label: "Hoy", icon: Home },
  { href: "/admin/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/admin/solicitudes", label: "Solicitudes", icon: Inbox },
  { href: "/admin/caja", label: "Caja", icon: Wallet },
  { href: "/admin/mas", label: "Más", icon: MoreHorizontal },
] as const;

const MAS_PREFIXES = ["/admin/mas", "/admin/servicios", "/admin/disponibilidad"];

export function AdminTabBar({ pendingCount }: { pendingCount: number }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Secciones del panel"
      className="bg-popover flex shrink-0 items-start border-t pt-1.5 pb-[max(env(safe-area-inset-bottom),22px)] md:hidden"
    >
      {LINKS.map(({ href, label, icon: Icon }) => {
        const active =
          href === "/admin"
            ? pathname === href
            : href === "/admin/mas"
              ? MAS_PREFIXES.some((prefix) => pathname?.startsWith(prefix))
              : pathname?.startsWith(href);

        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex h-14 flex-1 flex-col items-center justify-center gap-1",
              active ? "text-foreground" : "text-muted-foreground",
            )}
          >
            <span className="relative flex">
              <Icon className="size-5.5" strokeWidth={1.75} aria-hidden="true" />
              {href === "/admin/solicitudes" && pendingCount > 0 ? (
                <span className="bg-foreground text-background absolute -top-0.5 -right-2 flex h-[17px] min-w-[17px] items-center justify-center rounded-full px-1 text-[10px] leading-none font-medium">
                  {pendingCount}
                </span>
              ) : null}
            </span>
            <span className={cn("text-[10px]", active ? "font-medium" : "font-normal")}>
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
