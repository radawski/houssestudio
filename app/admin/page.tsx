import type { Metadata } from "next";
import Link from "next/link";

import { AppointmentCard } from "@/components/admin/appointment-card";
import { Card, CardContent } from "@/components/ui/card";
import { getAppointmentsForDay, getPendingAppointments } from "@/lib/data/appointments";
import { todayKey } from "@/lib/dates";
import { formatLongDate } from "@/lib/format";
import { dayRange } from "@/lib/dates";

export const metadata: Metadata = { title: "Hoy" };

export const dynamic = "force-dynamic";

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="py-4">
        <p className="text-muted-foreground text-xs">{label}</p>
        <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}

export default async function AdminHomePage() {
  const today = todayKey();

  const [appointments, pending] = await Promise.all([
    getAppointmentsForDay(today),
    getPendingAppointments(),
  ]);

  const confirmed = appointments.filter((a) => a.status === "confirmado");
  const pendingToday = appointments.filter((a) => a.status === "pendiente");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold first-letter:uppercase">
          {formatLongDate(dayRange(today).start)}
        </h1>
        <p className="text-muted-foreground text-sm">Tu día de un vistazo.</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Stat label="Turnos hoy" value={confirmed.length + pendingToday.length} />
        <Stat label="Confirmados" value={confirmed.length} />
        <Stat label="Pendientes" value={pending.length} />
      </div>

      {pending.length > 0 ? (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="py-4 text-sm text-amber-950">
            Tenés {pending.length} solicitud{pending.length > 1 ? "es" : ""} esperando
            respuesta.{" "}
            <Link href="/admin/solicitudes" className="font-medium underline">
              Revisarlas
            </Link>
          </CardContent>
        </Card>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-muted-foreground text-xs font-medium tracking-widest uppercase">
          Agenda del día
        </h2>

        {appointments.length === 0 ? (
          <Card>
            <CardContent className="text-muted-foreground py-10 text-center text-sm">
              No hay turnos para hoy.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {appointments.map((appointment) => (
              <AppointmentCard key={appointment.id} appointment={appointment} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
