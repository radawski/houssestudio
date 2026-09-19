import type { PaymentMethod } from "@/lib/supabase/database.types";

/**
 * Agregación de caja — función pura, mismo patrón que `lib/availability.ts`:
 * sin Supabase, sin `server-only`, para poder testear el desglose sin tocar
 * la base.
 */

export type Charge = { amount: number; method: PaymentMethod };

export type CashboxBreakdown = {
  total: number;
  byMethod: Record<PaymentMethod, number>;
};

export function summarizeCharges(charges: Charge[]): CashboxBreakdown {
  const byMethod: Record<PaymentMethod, number> = { efectivo: 0, transferencia: 0 };
  let total = 0;

  for (const charge of charges) {
    byMethod[charge.method] += charge.amount;
    total += charge.amount;
  }

  return { total, byMethod };
}
