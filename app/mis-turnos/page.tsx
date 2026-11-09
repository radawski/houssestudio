import type { Metadata } from "next";
import Link from "next/link";

import { MyAppointments } from "@/components/public/my-appointments";
import { BUSINESS_NAME } from "@/lib/config";
import { getMyAppointmentsCustomerId, loadMyAppointments } from "@/lib/data/my-appointments";

export const metadata: Metadata = { title: "Mis turnos" };

/**
 * "Mis turnos": el cliente ve sus turnos con DNI + teléfono, sin el link del
 * mail. Mismo marco que `/turno/[token]`, que es adonde lleva cada turno.
 *
 * Si el navegador tiene una sesión vigente (se identificó hace menos de 30
 * minutos), la lista se arma acá y el cliente vuelve directo a ella.
 */
export default async function MyAppointmentsPage() {
  const customerId = await getMyAppointmentsCustomerId();
  const initial = customerId ? await loadMyAppointments(customerId) : null;

  return (
    <main className="flex min-h-dvh flex-1 flex-col px-6 py-10 sm:px-10">
      <Link href="/" className="text-xs tracking-[var(--hs-tracking-wide)] uppercase">
        {BUSINESS_NAME}
      </Link>

      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center py-12">
        <MyAppointments initial={initial} />
      </div>
    </main>
  );
}
