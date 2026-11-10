"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth";
import { revalidateAgenda } from "@/lib/cache";
import { fillRecurring } from "@/lib/data/recurring";

/**
 * Turno fijo (plan de noviembre, T2): lo que hace el peluquero desde la
 * ficha del cliente y desde el aviso de Hoy. Todo pasa por la sesión del
 * admin (RLS `_admin_all`), salvo volver a completar fechas al reanudar,
 * que usa el generador de siempre.
 */

const END_REASON = "Fin de turno fijo";

async function customerOf(id: string) {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase
    .from("recurring_appointments")
    .select("customer_id")
    .eq("id", id)
    .single();
  if (error || !data) throw new Error("No encontramos ese turno fijo.");
  return { supabase, customerId: data.customer_id };
}

/**
 * Pausar: deja de sumar fechas nuevas. Las que ya están agendadas quedan (se
 * cancelan una por una si hace falta).
 */
export async function pauseRecurring(id: string) {
  const { supabase, customerId } = await customerOf(id);
  const { error } = await supabase.from("recurring_appointments").update({ active: false }).eq("id", id);
  if (error) throw new Error(`No se pudo pausar el turno fijo: ${error.message}`);
  revalidatePath(`/admin/clientes/${customerId}`);
}

/** Reanudar: vuelve a completar las próximas 4 fechas desde hoy. */
export async function resumeRecurring(id: string) {
  const { supabase, customerId } = await customerOf(id);
  const { error } = await supabase
    .from("recurring_appointments")
    .update({ active: true })
    .eq("id", id)
    .is("ended_at", null);
  if (error) throw new Error(`No se pudo reanudar el turno fijo: ${error.message}`);

  const filled = await fillRecurring({ ids: [id] });
  revalidateAgenda();
  revalidatePath(`/admin/clientes/${customerId}`);
  return { agendados: filled.agendados, salteados: filled.salteados.length };
}

/**
 * Terminar: la regla deja de generar y las fechas futuras que ya estaban
 * agendadas se cancelan con el motivo "Fin de turno fijo". No se manda un
 * mail por cada una: se supone que el peluquero ya lo habló con el cliente.
 */
export async function endRecurring(id: string) {
  const { supabase, customerId } = await customerOf(id);
  const now = new Date().toISOString();

  const { error } = await supabase
    .from("recurring_appointments")
    .update({ active: false, ended_at: now })
    .eq("id", id);
  if (error) throw new Error(`No se pudo terminar el turno fijo: ${error.message}`);

  const [cancelled, skips] = await Promise.all([
    supabase
      .from("appointments")
      .update({ status: "cancelado", cancelled_at: now, cancelled_by: "barbero", cancellation_reason: END_REASON })
      .eq("recurring_id", id)
      .in("status", ["pendiente", "confirmado"])
      .gt("starts_at", now)
      .select("id"),
    supabase.from("recurring_skips").update({ resolved_at: now }).eq("recurring_id", id).is("resolved_at", null),
  ]);
  if (cancelled.error) throw new Error(`No se pudieron cancelar las fechas siguientes: ${cancelled.error.message}`);
  if (skips.error) console.error(`No se pudieron cerrar los avisos del turno fijo: ${skips.error.message}`);

  revalidateAgenda();
  revalidatePath(`/admin/clientes/${customerId}`);
  return { cancelados: cancelled.data?.length ?? 0 };
}

/** "Saltear esa fecha" en el aviso de Hoy: el aviso se cierra sin agendar nada. */
export async function dismissRecurringSkip(skipId: string) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase
    .from("recurring_skips")
    .update({ resolved_at: new Date().toISOString() })
    .eq("id", skipId);
  if (error) throw new Error(`No se pudo cerrar el aviso: ${error.message}`);
  revalidatePath("/admin");
}
