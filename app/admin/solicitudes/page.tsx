import type { Metadata } from "next";
import { Inbox } from "lucide-react";

import { AppointmentCard } from "@/components/admin/appointment-card";
import { Card, CardContent } from "@/components/ui/card";
import { getPendingAppointments } from "@/lib/data/appointments";

export const metadata: Metadata = { title: "Solicitudes" };

export const dynamic = "force-dynamic";

export default async function RequestsPage() {
  const pending = await getPendingAppointments();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Solicitudes</h1>
        <p className="text-muted-foreground text-sm">
          Turnos esperando tu respuesta. Mientras estén pendientes ocupan el horario.
        </p>
      </div>

      {pending.length === 0 ? (
        <Card>
          <CardContent className="text-muted-foreground flex flex-col items-center gap-2 py-12 text-sm">
            <Inbox className="size-6" />
            No hay solicitudes pendientes.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {pending.map((appointment) => (
            <AppointmentCard key={appointment.id} appointment={appointment} showDate />
          ))}
        </div>
      )}
    </div>
  );
}
