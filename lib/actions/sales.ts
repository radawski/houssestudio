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
import { walkInSalePaymentSchema, walkInSaleSchema } from "@/lib/validation/schemas";

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
  /** Pago dividido (0016): cuánto fue en efectivo; el resto, por transferencia. */
  cash?: number;
  note?: string;
  /**
   * "Anular y volver a cargar" (0018): la venta que esta reemplaza. Se borra
   * en la misma transacción en la que se registra la nueva.
   */
  replacesSaleId?: string;
}): Promise<ActionState> {
  const { supabase } = await requireAdmin();

  const { replacesSaleId, ...sale } = input;
  const parsed = walkInSaleSchema.safeParse(sale);
  if (!parsed.success) return validationError(parsed.error);

  const { items, method, cash, note } = parsed.data;
  const { error } = replacesSaleId
    ? await supabase.rpc("replace_walk_in_sale", {
        p_sale_id: replacesSaleId,
        p_items: items,
        p_method: method,
        p_cash: cash ?? null,
        p_note: note || null,
      })
    : cash === undefined
      ? await supabase.rpc("record_walk_in_sale", { p_items: items, p_method: method, p_note: note || null })
      : await supabase.rpc("record_walk_in_sale_split", { p_items: items, p_cash: cash, p_note: note || null });

  if (error) {
    if (error.message.includes("ya no existe")) {
      return actionError("La venta que querías reemplazar ya no existe.");
    }
    if (error.message.includes("ya no esta disponible")) {
      return actionError("Un ítem de la venta ya no está en el catálogo. Revisá la venta y volvé a intentar.");
    }
    if (error.message.includes("no puede superar el total")) {
      return actionError("El efectivo no puede superar el total de la venta.");
    }
    return actionError(`No se pudo registrar la venta: ${error.message}`);
  }

  revalidateAgenda();
  const units = parsed.data.items.reduce((sum, item) => sum + item.quantity, 0);
  const label = `${units} ${units === 1 ? "unidad" : "unidades"}`;
  return actionSuccess(replacesSaleId ? `Venta corregida · ${label}.` : `Venta registrada · ${label}.`);
}

/**
 * Anula una venta suelta entera (todos sus ítems): se cargó mal o dos veces.
 * Es un borrado definitivo, decidido así para un negocio de una sola persona
 * (tasks/plan-correcciones-cobros.md). Una sola sentencia, así que no queda
 * una venta a medias.
 */
export async function voidWalkInSale(saleId: string): Promise<ActionState> {
  const { supabase } = await requireAdmin();

  const { data, error } = await supabase.from("walk_in_sales").delete().eq("sale_id", saleId).select("id");

  if (error) return actionError(`No se pudo anular la venta: ${error.message}`);
  if (!data || data.length === 0) return actionError("Esa venta ya no existe.");

  revalidateAgenda();
  return actionSuccess("Venta anulada.");
}

/** Cambia el medio de pago de una venta suelta ya registrada (0018). */
export async function correctWalkInSalePayment(input: {
  saleId: string;
  method: PaymentMethod;
  cash?: number;
}): Promise<ActionState> {
  const { supabase } = await requireAdmin();

  const parsed = walkInSalePaymentSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);

  const { saleId, method, cash } = parsed.data;
  const { error } = await supabase.rpc("update_walk_in_sale_payment", {
    p_sale_id: saleId,
    p_method: method,
    p_cash: cash ?? null,
  });

  if (error) {
    if (error.message.includes("ya no existe")) return actionError("Esa venta ya no existe.");
    if (error.message.includes("no puede superar el total")) {
      return actionError("El efectivo no puede superar el total de la venta.");
    }
    return actionError(`No se pudo cambiar el medio de pago: ${error.message}`);
  }

  revalidateAgenda();
  return actionSuccess("Medio de pago corregido.");
}
