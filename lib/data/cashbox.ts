import "server-only";

import {
  OTHER_CATEGORY,
  SERVICES_CATEGORY,
  summarizeCharges,
  type CashboxBreakdown,
  type CategorizedCharge,
} from "@/lib/cashbox";
import { createClient } from "@/lib/supabase/server";
import type { PaymentMethod } from "@/lib/supabase/database.types";

/**
 * Un movimiento de caja: un cobro de turno o un ítem de una venta suelta.
 * Trae también lo que necesita el agrupado por categoría
 * (`CategorizedCharge`): los servicios y los turnos caen en "Cortes", los
 * productos en su categoría, y los productos viejos de nombre libre (o de una
 * categoría borrada) en "Otros".
 */
export type CashboxMovement = CategorizedCharge & {
  id: string;
  /** `venta_suelta` es un servicio sin turno; `producto`, una venta de producto. */
  origin: "turno" | "venta_suelta" | "producto";
  serviceName: string;
  amount: number;
  method: PaymentMethod;
  /** `paid_at` o `sold_at`: cuándo se cobró, no cuándo se atendió al cliente. */
  at: string;
  /** Nota opcional de una venta suelta; los cobros de turnos no llevan. */
  note: string | null;
};

/**
 * Igual que `AppointmentWithCustomer` en `lib/data/appointments.ts`: el
 * embed `appointment:appointments(...)` no tipa solo porque
 * `database.types.ts` no declara relaciones, así que se castea.
 */
type PaymentRow = {
  id: string;
  amount: number;
  method: PaymentMethod;
  paid_at: string;
  appointment: { service_name_at_booking: string; status: string } | null;
};

export async function getCashboxSummary(range: {
  start: string;
  end: string;
}): Promise<{ movements: CashboxMovement[]; breakdown: CashboxBreakdown }> {
  const supabase = await createClient();

  const [paymentsResult, salesResult, categoriesResult] = await Promise.all([
    supabase
      .from("payments")
      .select("id, amount, method, paid_at, appointment:appointments(service_name_at_booking, status)")
      .gte("paid_at", range.start)
      .lt("paid_at", range.end),
    supabase
      .from("walk_in_sales")
      .select("id, kind, service_name, quantity, unit_price, category_id, amount, method, sold_at, note")
      .gte("sold_at", range.start)
      .lt("sold_at", range.end),
    supabase.from("product_categories").select("id, name, sort_order"),
  ]);

  if (paymentsResult.error) {
    throw new Error(`No se pudieron leer los cobros: ${paymentsResult.error.message}`);
  }
  if (salesResult.error) {
    throw new Error(`No se pudieron leer las ventas sueltas: ${salesResult.error.message}`);
  }
  if (categoriesResult.error) {
    throw new Error(`No se pudieron leer las categorías: ${categoriesResult.error.message}`);
  }

  const categories = new Map(categoriesResult.data.map((category) => [category.id, category]));
  const services = {
    categoryKey: SERVICES_CATEGORY.key,
    categoryName: SERVICES_CATEGORY.name,
    categoryOrder: 0,
  };

  // Un turno cancelado no borra su pago (dato histórico), pero tampoco tiene
  // que sumar en la caja. Hoy ningún flujo cancela un turno ya `completado`,
  // así que este filtro no descarta nada en la práctica — pero es la regla
  // que pide la spec, y no cuesta nada respetarla si algún día deja de ser
  // cierto.
  const paymentMovements: CashboxMovement[] = (
    paymentsResult.data as unknown as PaymentRow[]
  )
    .filter((row) => row.appointment?.status !== "cancelado")
    .map((row) => {
      const serviceName = row.appointment?.service_name_at_booking ?? "Turno eliminado";
      return {
        id: row.id,
        origin: "turno" as const,
        serviceName,
        amount: row.amount,
        method: row.method,
        at: row.paid_at,
        note: null,
        ...services,
        concept: serviceName,
        quantity: 1,
        unitPrice: row.amount,
      };
    });

  const saleMovements: CashboxMovement[] = salesResult.data.map((row) => {
    const category = row.category_id ? categories.get(row.category_id) : undefined;
    const placement =
      row.kind === "servicio"
        ? services
        : category
          ? { categoryKey: category.id, categoryName: category.name, categoryOrder: category.sort_order }
          : { categoryKey: OTHER_CATEGORY.key, categoryName: OTHER_CATEGORY.name, categoryOrder: 0 };
    return {
      id: row.id,
      origin: row.kind === "producto" ? ("producto" as const) : ("venta_suelta" as const),
      serviceName: row.service_name,
      amount: row.amount,
      method: row.method,
      at: row.sold_at,
      note: row.note,
      ...placement,
      concept: row.service_name,
      quantity: row.quantity,
      unitPrice: row.unit_price,
    };
  });

  const movements = [...paymentMovements, ...saleMovements].sort(
    (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime(),
  );

  return { movements, breakdown: summarizeCharges(movements) };
}
