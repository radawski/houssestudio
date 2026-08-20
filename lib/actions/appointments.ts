"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth";

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

  const { error } = await supabase
    .from("appointments")
    .update({
      status: "cancelado",
      cancelled_at: new Date().toISOString(),
      cancelled_by: "barbero",
      cancellation_reason: reason.trim() || null,
    })
    .eq("id", id)
    .in("status", ["pendiente", "confirmado"]);

  if (error) throw new Error(`No se pudo cancelar el turno: ${error.message}`);

  revalidateAgenda();
}
