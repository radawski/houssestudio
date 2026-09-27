import Link from "next/link";
import { ArrowLeft } from "lucide-react";

/**
 * Encabezado "← + título" de las pantallas que cuelgan de Más (Servicios y
 * Disponibilidad), solo mobile (design/admin-iphone n-sistema). En escritorio
 * esas pantallas siguen con su h1 y la navegación superior.
 */
export function BackHeader({ title, href = "/admin/mas" }: { title: string; href?: string }) {
  return (
    <div className="-ml-2 flex items-center gap-1 md:hidden">
      <Link
        href={href}
        aria-label="Volver a Más"
        className="hover:bg-accent flex size-11 items-center justify-center rounded-md"
      >
        <ArrowLeft className="size-5" strokeWidth={1.75} />
      </Link>
      <h1 className="text-base font-semibold">{title}</h1>
    </div>
  );
}
