import type { Metadata } from "next";
import Link from "next/link";

import { BUSINESS_NAME } from "@/lib/config";

export const metadata: Metadata = { title: "Página no encontrada", robots: { index: false } };

/**
 * 404 del sitio. Se llega sobre todo desde un link de turno viejo o mal
 * copiado (`/turno/[token]`, `/baja/[token]`), así que ofrece los dos caminos
 * que le sirven a un cliente: reservar o buscar sus turnos. Mismo marco que
 * "Mis turnos".
 */
export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-1 flex-col px-6 py-10 sm:px-10">
      <Link href="/" className="text-xs tracking-[var(--hs-tracking-wide)] uppercase">
        {BUSINESS_NAME}
      </Link>

      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center py-12">
        <h1 className="text-3xl font-light tracking-[var(--hs-tracking-tight)]">No encontramos esa página</h1>
        <p className="text-muted-foreground mt-3 text-sm">
          Puede que el link esté incompleto o que ya no exista. Si buscabas un turno, lo encontrás en
          &quot;Mis turnos&quot;.
        </p>

        <div className="mt-8 flex flex-col gap-3">
          <Link
            href="/"
            className="bg-foreground text-background hover:bg-[var(--hs-graphite)] focus-visible:ring-ring flex h-12 items-center justify-center text-sm tracking-[0.08em] uppercase transition-colors focus-visible:ring-2 focus-visible:outline-none"
          >
            Reservar turno
          </Link>
          <Link
            href="/mis-turnos"
            className="border-border hover:bg-accent focus-visible:ring-ring flex h-12 items-center justify-center border text-sm tracking-[0.08em] uppercase transition-colors focus-visible:ring-2 focus-visible:outline-none"
          >
            Mis turnos
          </Link>
        </div>
      </div>
    </main>
  );
}
