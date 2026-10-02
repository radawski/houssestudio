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

// ---------------------------------------------------------------------------
// Caja por categoría (tasks/plan-productos.md)
// ---------------------------------------------------------------------------

/** Clave fija de los servicios y de "Otros"; las categorías de productos usan su id. */
export const SERVICES_CATEGORY = { key: "cortes", name: "Cortes" } as const;
export const OTHER_CATEGORY = { key: "otros", name: "Otros" } as const;

/** Lo que el agrupado necesita de cada movimiento de caja. */
export type CategorizedCharge = Charge & {
  /** `cortes`, `otros` o el id de la categoría de productos. */
  categoryKey: string;
  categoryName: string;
  /** Orden de la categoría de productos (`sort_order`); no aplica a Cortes ni a Otros. */
  categoryOrder: number;
  /** Nombre del servicio o producto vendido. */
  concept: string;
  quantity: number;
  unitPrice: number;
};

export type ConceptTotal = {
  name: string;
  quantity: number;
  /** Precio por unidad si fue el mismo en todo el período; `null` si cambió. */
  unitPrice: number | null;
  total: number;
  byMethod: Record<PaymentMethod, number>;
};

export type CategoryGroup<T extends CategorizedCharge = CategorizedCharge> = {
  key: string;
  name: string;
  /** Unidades vendidas. */
  quantity: number;
  total: number;
  byMethod: Record<PaymentMethod, number>;
  /** Parte del total del período, de 0 a 1 (0 si el período no facturó). */
  share: number;
  /** Conceptos sumados por nombre, de mayor a menor facturación (semana y mes). */
  concepts: ConceptTotal[];
  /** Los movimientos de la categoría, en el orden recibido (día). */
  charges: T[];
};

function emptyByMethod(): Record<PaymentMethod, number> {
  return { efectivo: 0, transferencia: 0 };
}

/** Cortes primero, después las categorías de productos por su orden y nombre, Otros al final. */
function categoryRank(charge: CategorizedCharge): [number, number, string] {
  if (charge.categoryKey === SERVICES_CATEGORY.key) return [0, 0, ""];
  if (charge.categoryKey === OTHER_CATEGORY.key) return [2, 0, ""];
  return [1, charge.categoryOrder, charge.categoryName.toLocaleLowerCase("es")];
}

function compareRank(a: [number, number, string], b: [number, number, string]) {
  return a[0] - b[0] || a[1] - b[1] || a[2].localeCompare(b[2], "es");
}

/**
 * Agrupa los movimientos de un período por categoría. La suma de las
 * categorías es exactamente el total de `summarizeCharges` sobre los mismos
 * movimientos: cada uno cae en una sola categoría.
 */
export function groupByCategory<T extends CategorizedCharge>(charges: T[]): CategoryGroup<T>[] {
  const grandTotal = charges.reduce((sum, charge) => sum + charge.amount, 0);
  const groups = new Map<string, CategoryGroup<T>>();
  const ranks = new Map<string, [number, number, string]>();

  for (const charge of charges) {
    let group = groups.get(charge.categoryKey);
    if (!group) {
      group = {
        key: charge.categoryKey,
        name: charge.categoryName,
        quantity: 0,
        total: 0,
        byMethod: emptyByMethod(),
        share: 0,
        concepts: [],
        charges: [],
      };
      groups.set(charge.categoryKey, group);
      ranks.set(charge.categoryKey, categoryRank(charge));
    }

    group.quantity += charge.quantity;
    group.total += charge.amount;
    group.byMethod[charge.method] += charge.amount;
    group.charges.push(charge);

    let concept = group.concepts.find((c) => c.name === charge.concept);
    if (!concept) {
      concept = { name: charge.concept, quantity: 0, unitPrice: charge.unitPrice, total: 0, byMethod: emptyByMethod() };
      group.concepts.push(concept);
    }
    concept.quantity += charge.quantity;
    concept.total += charge.amount;
    concept.byMethod[charge.method] += charge.amount;
    if (concept.unitPrice !== charge.unitPrice) concept.unitPrice = null;
  }

  return [...groups.values()]
    .sort((a, b) => compareRank(ranks.get(a.key)!, ranks.get(b.key)!))
    .map((group) => ({
      ...group,
      share: grandTotal > 0 ? group.total / grandTotal : 0,
      concepts: group.concepts.sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, "es")),
    }));
}
