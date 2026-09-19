"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Clock, Home, Inbox, Scissors, Wallet } from "lucide-react";

import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/admin", label: "Hoy", icon: Home },
  { href: "/admin/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/admin/solicitudes", label: "Solicitudes", icon: Inbox },
  { href: "/admin/caja", label: "Caja", icon: Wallet },
  { href: "/admin/servicios", label: "Servicios", icon: Scissors },
  { href: "/admin/disponibilidad", label: "Disponibilidad", icon: Clock },
] as const;

export function AdminNav({ pendingCount }: { pendingCount: number }) {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 overflow-x-auto">
      {LINKS.map(({ href, label, icon: Icon }) => {
        // `/admin` es prefijo de todo lo demas, asi que solo marca activo si
        // coincide exacto; el resto tolera subrutas.
        const active = href === "/admin" ? pathname === href : pathname.startsWith(href);

        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-secondary text-secondary-foreground"
                : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
            )}
          >
            <Icon className="size-4" />
            {label}
            {href === "/admin/solicitudes" && pendingCount > 0 ? (
              <span className="bg-primary text-primary-foreground ml-0.5 rounded-full px-1.5 py-0.5 text-xs leading-none tabular-nums">
                {pendingCount}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
