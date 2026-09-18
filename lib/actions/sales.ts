"use server";

import {
  actionError,
  actionSuccess,
  validationError,
  type ActionState,
} from "@/lib/actions/result";
import { revalidateAgenda } from "@/lib/cache";
import { requireAdmin } from "@/lib/auth";
import { walkInSaleSchema } from "@/lib/validation/schemas";

/**
 * Registra un corte hecho sin turno reservado ("venta suelta").
 *
 * El servicio se resuelve con el cliente de sesión del propio barbero, no
 * con `service_role`: es una accion admin, y RLS queda como segunda barrera
 * igual que en el resto del panel.
 */
export async function recordWalkInSale(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { supabase } = await requireAdmin();

  const parsed = walkInSaleSchema.safeParse({
    serviceId: formData.get("serviceId"),
    amount: formData.get("amount"),
    method: formData.get("method"),
    note: formData.get("note") || undefined,
  });

  if (!parsed.success) return validationError(parsed.error);

  const { data: service } = await supabase
    .from("services")
    .select("id, name")
    .eq("id", parsed.data.serviceId)
    .maybeSingle();

  if (!service) return actionError("Ese servicio ya no está disponible.");

  const { error } = await supabase.from("walk_in_sales").insert({
    service_id: service.id,
    service_name: service.name,
    amount: parsed.data.amount,
    method: parsed.data.method,
    note: parsed.data.note ?? null,
  });

  if (error) return actionError(`No se pudo registrar la venta: ${error.message}`);

  revalidateAgenda();
  return actionSuccess("Venta registrada.");
}
