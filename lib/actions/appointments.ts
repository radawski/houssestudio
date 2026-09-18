"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth";
import { sendCancellationNotice } from "@/lib/email/send";

/**
 * Los tipos de `database.types.ts` no declaran relaciones (son manuales, no
 * generados), así que el embed `customer:customers(...)` no tipa solo: se
 * castea, mismo mecanismo que `AppointmentWithCustomer` en
 * `lib/data/appointments.ts`.
 */
type CancelledAppointment = {
  service_name_at_booking: string;
  starts_at: string;
  cancellation_reason: string | null;
  customer: { full_name: string; email: string | null } | null;
};

/**
 * Transiciones de estado de un turno, disparadas desde el panel.
 *
 * Todas revalidan las mismas rutas porque cualquier cambio de estado afecta a la
 * vez la agenda, la bandeja de pendientes y la disponibilidad publica: confirmar
 * o cancelar mueve el slot dentro o fuera de la grilla que ve el cliente.
 */
function revalidateAgenda() {
  revalidatePath("/admin");
  revalidatePath("/admin/agenda");
  revalidatePath("/admin/solicitudes");
  revalidatePath("/reservar");
}

export async function confirmAppointment(id: string) {
  const { supabase } = await requireAdmin();

  const { error } = await supabase
    .from("appointments")
    .update({ status: "confirmado", confirmed_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "pendiente");

  if (error) throw new Error(`No se pudo confirmar el turno: ${error.message}`);

  revalidateAgenda();
}

/**
 * Cancela un turno y libera el horario.
 *
 * No hay que tocar nada mas para liberarlo: la restriccion de exclusion de la
 * base solo mira los estados `pendiente` y `confirmado`, asi que al pasar a
 * `cancelado` el slot vuelve a ofrecerse solo.
 */
export async function cancelAppointment(id: string, reason: string) {
  const { supabase } = await requireAdmin();

  const { data, error } = await supabase
    .from("appointments")
    .update({
      status: "cancelado",
      cancelled_at: new Date().toISOString(),
      cancelled_by: "barbero",
      cancellation_reason: reason.trim() || null,
    })
    .eq("id", id)
    .in("status", ["pendiente", "confirmado"])
    .select(
      "service_name_at_booking, starts_at, cancellation_reason, customer:customers(full_name, email)",
    )
    .single();

  if (error) throw new Error(`No se pudo cancelar el turno: ${error.message}`);

  const appointment = data as unknown as CancelledAppointment;

  revalidateAgenda();

  // Nunca lanza: un fallo de envío no puede tumbar una cancelación ya guardada.
  if (appointment.customer) {
    await sendCancellationNotice({
      appointmentId: id,
      toEmail: appointment.customer.email,
      fullName: appointment.customer.full_name,
      serviceName: appointment.service_name_at_booking,
      startsAt: appointment.starts_at,
      reason: appointment.cancellation_reason,
      cancelledBy: "barbero",
    });
  }
}
