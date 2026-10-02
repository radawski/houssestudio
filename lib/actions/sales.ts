"use server";

import {
  actionError,
  actionSuccess,
  validationError,
  type ActionState,
} from "@/lib/actions/result";
import { revalidateAgenda } from "@/lib/cache";
import { requireAdmin } from "@/lib/auth";
import type { PaymentMethod, WalkInSaleKind } from "@/lib/supabase/database.types";
import { walkInSaleSchema } from "@/lib/validation/schemas";

/**
 * Registra una venta sin turno: uno o más ítems del catálogo (cortes que
 * entraron de pasada, productos) con un medio de pago y una nota.
 *
 * Toda la venta va en una sola llamada a `record_walk_in_sale` (migración
 * 0012): una transacción que toma nombre y precio del catálogo en el
 * servidor, así no queda una venta a medias ni un precio enviado desde el
 * navegador. Va con el cliente de sesión del barbero, y RLS queda como
 * segunda barrera igual que en el resto del panel.
 */
export async function recordWalkInSale(input: {
  items: { kind: WalkInSaleKind; id: string; quantity: number }[];
  method: PaymentMethod;
  note?: string;
}): Promise<ActionState> {
  const { supabase } = await requireAdmin();

  const parsed = walkInSaleSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);

  const { error } = await supabase.rpc("record_walk_in_sale", {
    p_items: parsed.data.items,
    p_method: parsed.data.method,
    p_note: parsed.data.note || null,
  });

  if (error) {
    if (error.message.includes("ya no esta disponible")) {
      return actionError("Un ítem de la venta ya no está en el catálogo. Revisá la venta y volvé a intentar.");
    }
    return actionError(`No se pudo registrar la venta: ${error.message}`);
  }

  revalidateAgenda();
  const units = parsed.data.items.reduce((sum, item) => sum + item.quantity, 0);
  return actionSuccess(`Venta registrada · ${units} ${units === 1 ? "unidad" : "unidades"}.`);
}
