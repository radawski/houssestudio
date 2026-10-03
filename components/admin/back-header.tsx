"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { getNavTrack } from "@/components/admin/navigation-tracker";
import { canGoBackToMas, MAS_RETURN_KEY, writeSession } from "@/lib/mas-return";

const MAS_HREF = "/admin/mas";

/**
 * Encabezado "← + título" de las pantallas que cuelgan de Más (Servicios y
 * Disponibilidad), solo mobile (design/admin-iphone n-sistema). En escritorio
 * esas pantallas siguen con su h1 y la navegación superior.
 *
 * Volviendo a Más, si la entrada anterior del historial es Más el ← usa
 * `router.back()`: vuelve desde la caché del router, sin esqueleto
 * (`lib/mas-return.ts`). En cualquier otro caso es un link común.
 */
export function BackHeader({
  title,
  href = MAS_HREF,
  backLabel = "Volver a Más",
}: {
  title: string;
  href?: string;
  backLabel?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();

  function handleClick(event: React.MouseEvent<HTMLAnchorElement>) {
    if (href !== MAS_HREF) return;
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    // Más marca la fila de la que se vuelve, se llegue con `back()` o con el link.
    writeSession(MAS_RETURN_KEY, JSON.stringify({ row: pathname, at: Date.now() }));

    if (canGoBackToMas(getNavTrack())) {
      event.preventDefault();
      router.back();
    }
  }

  return (
    <div className="-ml-2 flex items-center gap-1 md:hidden">
      <Link
        href={href}
        onClick={handleClick}
        aria-label={backLabel}
        className="hover:bg-accent flex size-11 items-center justify-center rounded-md"
      >
        <ArrowLeft className="size-5" strokeWidth={1.75} />
      </Link>
      <h1 className="text-base font-semibold">{title}</h1>
    </div>
  );
}
