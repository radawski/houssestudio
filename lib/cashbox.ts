import { toDateKey } from "@/lib/dates";
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

export type DayRevenue = { dateKey: string; total: number; isClosed: boolean };

/**
 * Agrupa movimientos por día local del local (design/admin-iphone
 * n-CajaSemana / n-CajaMes: "Por día"). `days` fija qué fechas entran y en
 * qué orden — no se derivan de los movimientos, para que un día sin
 * facturación siga apareciendo con total 0 en vez de faltar en la lista.
 * `closedDays` distingue "no facturó" de "no abrió": un día cerrado nunca
 * tiene barra ni entra en el promedio, aunque su total sea 0 igual que un
 * día abierto flojo.
 */
export function buildDayRevenues(
  days: string[],
  charges: { amount: number; at: string }[],
  closedDays: ReadonlySet<string>,
): DayRevenue[] {
  const totals = new Map<string, number>();
  for (const charge of charges) {
    const key = toDateKey(new Date(charge.at));
    totals.set(key, (totals.get(key) ?? 0) + charge.amount);
  }

  return days.map((dateKey) => ({
    dateKey,
    total: totals.get(dateKey) ?? 0,
    isClosed: closedDays.has(dateKey),
  }));
}

/** El día de mayor facturación entre los abiertos, o `null` si ninguno abrió. */
export function bestDay(dayRevenues: DayRevenue[]): DayRevenue | null {
  const open = dayRevenues.filter((day) => !day.isClosed);
  if (open.length === 0) return null;
  return open.reduce((best, day) => (day.total > best.total ? day : best));
}

/** Promedio de facturación por día abierto — un cerrado no cuenta ni en la suma ni en el divisor. */
export function averagePerOpenDay(dayRevenues: DayRevenue[]): { average: number; openDays: number } {
  const open = dayRevenues.filter((day) => !day.isClosed);
  if (open.length === 0) return { average: 0, openDays: 0 };

  const total = open.reduce((sum, day) => sum + day.total, 0);
  return { average: total / open.length, openDays: open.length };
}
