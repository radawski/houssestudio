import type { Metadata } from "next";
import Link from "next/link";

import { MyAppointments } from "@/components/public/my-appointments";
import { BUSINESS_NAME } from "@/lib/config";

export const metadata: Metadata = { title: "Mis turnos" };

/**
 * "Mis turnos": el cliente ve sus turnos con DNI + teléfono, sin el link del
 * mail. Mismo marco que `/turno/[token]`, que es adonde lleva cada turno.
 */
export default function MyAppointmentsPage() {
  return (
    <main className="flex min-h-dvh flex-1 flex-col px-6 py-10 sm:px-10">
      <Link href="/" className="text-xs tracking-[var(--hs-tracking-wide)] uppercase">
        {BUSINESS_NAME}
      </Link>

      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center py-12">
        <MyAppointments />
      </div>
    </main>
  );
}
