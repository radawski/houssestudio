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
 * Registra una venta sin turno reservado: un corte que entró de pasada
 * ("servicio") o un producto ("producto").
 *
 * El servicio se resuelve con el cliente de sesión del propio barbero, no
 * con `service_role`: es una accion admin, y RLS queda como segunda barrera
 * igual que en el resto del panel. Un producto no pasa por el catálogo.
 */
export async function recordWalkInSale(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { supabase } = await requireAdmin();

  const parsed = walkInSaleSchema.safeParse({
    kind: formData.get("kind"),
    serviceId: formData.get("serviceId") ?? undefined,
    productName: formData.get("productName") ?? undefined,
    amount: formData.get("amount"),
    method: formData.get("method"),
    note: formData.get("note") || undefined,
  });

  if (!parsed.success) return validationError(parsed.error);

  const sale = parsed.data;
  let item: { service_id: string | null; service_name: string };

  if (sale.kind === "servicio") {
    const { data: service } = await supabase
      .from("services")
      .select("id, name")
      .eq("id", sale.serviceId)
      .maybeSingle();

    if (!service) return actionError("Ese servicio ya no está disponible.");
    item = { service_id: service.id, service_name: service.name };
  } else {
    item = { service_id: null, service_name: sale.productName };
  }

  const { error } = await supabase.from("walk_in_sales").insert({
    kind: sale.kind,
    ...item,
    amount: sale.amount,
    method: sale.method,
    note: sale.note ?? null,
  });

  if (error) return actionError(`No se pudo registrar la venta: ${error.message}`);

  revalidateAgenda();
  return actionSuccess("Venta registrada.");
}
