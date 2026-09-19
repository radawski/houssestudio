"use server";

import { revalidateAgenda } from "@/lib/cache";
import { requireAdmin } from "@/lib/auth";
import { sendCancellationNotice } from "@/lib/email/send";
import type { PaymentMethod } from "@/lib/supabase/database.types";
import { paymentSchema } from "@/lib/validation/schemas";

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
 * Cierra la atencion de un turno: lo marca completado y registra el cobro.
 *
 * Las dos escrituras (el UPDATE del estado y el INSERT del pago) van dentro
 * de `complete_appointment_with_payment`, una funcion de Postgres, y no como
 * dos llamadas sueltas desde aca. Sin eso, un fallo de red entre una y otra
 * podria dejar el turno completado sin pago o, peor, un pago sin turno
 * completado - exactamente el estado intermedio que no puede existir.
 */
export async function completeAppointment(
  id: string,
  payment: { amount: number; method: PaymentMethod },
) {
  const { supabase } = await requireAdmin();

  const parsed = paymentSchema.safeParse({ appointmentId: id, ...payment });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Datos de pago invalidos.");
  }

  const { error } = await supabase.rpc("complete_appointment_with_payment", {
    p_appointment_id: id,
    p_amount: parsed.data.amount,
    p_method: parsed.data.method,
  });

  if (error) throw new Error(`No se pudo registrar el cobro: ${error.message}`);

  revalidateAgenda();
}

/**
 * Marca un turno confirmado como ausente, sin cobro.
 *
 * El `.eq("status", "confirmado")` y el `.lte("starts_at", ...)` son la
 * guarda real, no `canMarkNoShow` del lado del cliente: esa función solo
 * decide si se muestra el botón. Mismo criterio que `cancelByToken` con su
 * ventana de cancelación — la regla temporal vive en el `UPDATE`, no en un
 * chequeo previo que deja una ventana entre leer y escribir.
 */
export async function markNoShow(id: string) {
  const { supabase } = await requireAdmin();

  const { data, error } = await supabase
    .from("appointments")
    .update({ status: "no_show" })
    .eq("id", id)
    .eq("status", "confirmado")
    .lte("starts_at", new Date().toISOString())
    .select("id")
    .maybeSingle();

  if (error) throw new Error(`No se pudo marcar el turno como ausente: ${error.message}`);
  if (!data) {
    throw new Error(
      "Ese turno ya no se puede marcar como ausente (no está confirmado o todavía no empezó).",
    );
  }

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
