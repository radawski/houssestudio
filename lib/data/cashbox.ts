import "server-only";

import { summarizeCharges, type CashboxBreakdown } from "@/lib/cashbox";
import { createClient } from "@/lib/supabase/server";
import type { PaymentMethod } from "@/lib/supabase/database.types";

export type CashboxMovement = {
  id: string;
  origin: "turno" | "venta_suelta";
  serviceName: string;
  amount: number;
  method: PaymentMethod;
  /** `paid_at` o `sold_at`: cuándo se cobró, no cuándo se atendió al cliente. */
  at: string;
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

  const [paymentsResult, salesResult] = await Promise.all([
    supabase
      .from("payments")
      .select("id, amount, method, paid_at, appointment:appointments(service_name_at_booking, status)")
      .gte("paid_at", range.start)
      .lt("paid_at", range.end),
    supabase
      .from("walk_in_sales")
      .select("id, service_name, amount, method, sold_at")
      .gte("sold_at", range.start)
      .lt("sold_at", range.end),
  ]);

  if (paymentsResult.error) {
    throw new Error(`No se pudieron leer los cobros: ${paymentsResult.error.message}`);
  }
  if (salesResult.error) {
    throw new Error(`No se pudieron leer las ventas sueltas: ${salesResult.error.message}`);
  }

  // Un turno cancelado no borra su pago (dato histórico), pero tampoco tiene
  // que sumar en la caja. Hoy ningún flujo cancela un turno ya `completado`,
  // así que este filtro no descarta nada en la práctica — pero es la regla
  // que pide la spec, y no cuesta nada respetarla si algún día deja de ser
  // cierto.
  const paymentMovements: CashboxMovement[] = (
    paymentsResult.data as unknown as PaymentRow[]
  )
    .filter((row) => row.appointment?.status !== "cancelado")
    .map((row) => ({
      id: row.id,
      origin: "turno" as const,
      serviceName: row.appointment?.service_name_at_booking ?? "Turno eliminado",
      amount: row.amount,
      method: row.method,
      at: row.paid_at,
    }));

  const saleMovements: CashboxMovement[] = salesResult.data.map((row) => ({
    id: row.id,
    origin: "venta_suelta" as const,
    serviceName: row.service_name,
    amount: row.amount,
    method: row.method,
    at: row.sold_at,
  }));

  const movements = [...paymentMovements, ...saleMovements].sort(
    (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime(),
  );

  return { movements, breakdown: summarizeCharges(movements) };
}
