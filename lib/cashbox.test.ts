import { describe, expect, it } from "vitest";

import {
  averagePerOpenDay,
  bestDay,
  buildDayRevenues,
  type CategorizedCharge,
  groupByCategory,
  OTHER_CATEGORY,
  SERVICES_CATEGORY,
  summarizeCharges,
} from "@/lib/cashbox";

describe("summarizeCharges", () => {
  it("devuelve cero en los dos medios, no un objeto vacío, para una lista vacía", () => {
    expect(summarizeCharges([])).toEqual({
      total: 0,
      byMethod: { efectivo: 0, transferencia: 0 },
    });
  });

  it("suma un solo medio de pago", () => {
    const result = summarizeCharges([
      { amount: 8000, method: "efectivo" },
      { amount: 12000, method: "efectivo" },
    ]);

    expect(result).toEqual({
      total: 20000,
      byMethod: { efectivo: 20000, transferencia: 0 },
    });
  });

  it("desglosa ambos medios mezclados", () => {
    const result = summarizeCharges([
      { amount: 8000, method: "efectivo" },
      { amount: 15000, method: "transferencia" },
      { amount: 5000, method: "efectivo" },
    ]);

    expect(result).toEqual({
      total: 28000,
      byMethod: { efectivo: 13000, transferencia: 15000 },
    });
  });

  it("conserva los decimales", () => {
    const result = summarizeCharges([
      { amount: 1500.5, method: "efectivo" },
      { amount: 999.25, method: "transferencia" },
    ]);

    expect(result.total).toBeCloseTo(2499.75);
    expect(result.byMethod.efectivo).toBeCloseTo(1500.5);
  });
});

// Mediodia en hora argentina (UTC-3), bien lejos de la medianoche para no
// depender de en qué borde de dia caiga.
const at = (dateKey: string) => `${dateKey}T15:00:00.000Z`;

describe("buildDayRevenues", () => {
  const days = ["2026-09-14", "2026-09-15", "2026-09-16"];

  it("un dia sin movimientos queda en 0, no falta de la lista", () => {
    const result = buildDayRevenues(days, [], new Set());

    expect(result).toEqual([
      { dateKey: "2026-09-14", total: 0, isClosed: false },
      { dateKey: "2026-09-15", total: 0, isClosed: false },
      { dateKey: "2026-09-16", total: 0, isClosed: false },
    ]);
  });

  it("suma varios movimientos del mismo dia y marca los cerrados", () => {
    const result = buildDayRevenues(
      days,
      [
        { amount: 12000, at: at("2026-09-15") },
        { amount: 18000, at: at("2026-09-15") },
        { amount: 9000, at: at("2026-09-16") },
      ],
      new Set(["2026-09-14"]),
    );

    expect(result).toEqual([
      { dateKey: "2026-09-14", total: 0, isClosed: true },
      { dateKey: "2026-09-15", total: 30000, isClosed: false },
      { dateKey: "2026-09-16", total: 9000, isClosed: false },
    ]);
  });

  it("ignora movimientos de un dia fuera del periodo pedido", () => {
    const result = buildDayRevenues(
      days,
      [{ amount: 5000, at: at("2026-09-20") }],
      new Set(),
    );

    expect(result.reduce((sum, day) => sum + day.total, 0)).toBe(0);
  });

  it("conserva el total: la suma por dia coincide con summarizeCharges cuando todos los movimientos caen dentro del periodo", () => {
    const charges = [
      { amount: 12000, method: "efectivo" as const, at: at("2026-09-14") },
      { amount: 18000, method: "transferencia" as const, at: at("2026-09-15") },
      { amount: 9000, method: "efectivo" as const, at: at("2026-09-16") },
      { amount: 30000, method: "efectivo" as const, at: at("2026-09-16") },
    ];

    const dayRevenues = buildDayRevenues(days, charges, new Set());
    const fromDays = dayRevenues.reduce((sum, day) => sum + day.total, 0);
    const fromBreakdown = summarizeCharges(charges).total;

    expect(fromDays).toBe(fromBreakdown);
  });
});

describe("bestDay", () => {
  it("sin dias abiertos, no hay mejor dia", () => {
    expect(
      bestDay([
        { dateKey: "2026-09-14", total: 0, isClosed: true },
        { dateKey: "2026-09-15", total: 0, isClosed: true },
      ]),
    ).toBeNull();
  });

  it("elige el de mayor total entre los abiertos, ignorando cerrados", () => {
    const result = bestDay([
      { dateKey: "2026-09-14", total: 999999, isClosed: true }, // cerrado: no cuenta aunque tenga un total
      { dateKey: "2026-09-15", total: 30000, isClosed: false },
      { dateKey: "2026-09-16", total: 54000, isClosed: false },
      { dateKey: "2026-09-17", total: 48000, isClosed: false },
    ]);

    expect(result?.dateKey).toBe("2026-09-16");
  });
});

describe("averagePerOpenDay", () => {
  it("sin dias abiertos, promedio 0 y cero dias", () => {
    expect(averagePerOpenDay([{ dateKey: "2026-09-14", total: 0, isClosed: true }])).toEqual({
      average: 0,
      openDays: 0,
    });
  });

  it("promedia solo entre los dias abiertos, cerrados afuera de la suma y el divisor", () => {
    const result = averagePerOpenDay([
      { dateKey: "2026-09-14", total: 0, isClosed: true },
      { dateKey: "2026-09-15", total: 42000, isClosed: false },
      { dateKey: "2026-09-16", total: 54000, isClosed: false },
      { dateKey: "2026-09-17", total: 30000, isClosed: false },
      { dateKey: "2026-09-18", total: 48000, isClosed: false },
      { dateKey: "2026-09-19", total: 54000, isClosed: false },
      { dateKey: "2026-09-20", total: 0, isClosed: true },
    ]);

    expect(result.openDays).toBe(5);
    expect(result.average).toBeCloseTo(45600);
  });
});

describe("groupByCategory", () => {
  const charge = (over: Partial<CategorizedCharge>): CategorizedCharge => ({
    amount: 12000,
    method: "efectivo",
    categoryKey: SERVICES_CATEGORY.key,
    categoryName: SERVICES_CATEGORY.name,
    categoryOrder: 0,
    concept: "Corte de pelo",
    quantity: 1,
    unitPrice: 12000,
    ...over,
  });
  const bebidas = { categoryKey: "cat-bebidas", categoryName: "Bebidas y alfajores", categoryOrder: 2 };
  const ceras = { categoryKey: "cat-ceras", categoryName: "Ceras", categoryOrder: 1 };

  const charges: CategorizedCharge[] = [
    charge({}),
    charge({ method: "transferencia" }),
    charge({ concept: "Corte + barba", amount: 18000, unitPrice: 18000 }),
    charge({ ...bebidas, concept: "Coca-Cola", amount: 4600, quantity: 2, unitPrice: 2300 }),
    charge({ ...bebidas, concept: "Alfajor", amount: 1500, unitPrice: 1500, method: "transferencia" }),
    charge({ ...ceras, concept: "Cera mate", amount: 8000, unitPrice: 8000 }),
    charge({ categoryKey: OTHER_CATEGORY.key, categoryName: OTHER_CATEGORY.name, concept: "coca", amount: 2300, unitPrice: 2300 }),
  ];

  it("ordena Cortes, luego productos por su orden, y Otros al final", () => {
    expect(groupByCategory(charges).map((g) => g.name)).toEqual([
      "Cortes",
      "Ceras",
      "Bebidas y alfajores",
      "Otros",
    ]);
  });

  it("suma unidades, total y medio de pago por categoría", () => {
    const bebidasGroup = groupByCategory(charges).find((g) => g.key === "cat-bebidas")!;
    expect(bebidasGroup.quantity).toBe(3);
    expect(bebidasGroup.total).toBe(6100);
    expect(bebidasGroup.byMethod).toEqual({ efectivo: 4600, transferencia: 1500 });
    expect(bebidasGroup.charges).toHaveLength(2);
  });

  it("conserva el total: la suma de categorías es la de summarizeCharges", () => {
    const groups = groupByCategory(charges);
    const sum = groups.reduce((acc, g) => acc + g.total, 0);
    expect(sum).toBe(summarizeCharges(charges).total);
    expect(groups.reduce((acc, g) => acc + g.share, 0)).toBeCloseTo(1);
  });

  it("agrupa conceptos por nombre, de mayor a menor facturación", () => {
    const cortes = groupByCategory(charges)[0];
    expect(cortes.concepts.map((c) => [c.name, c.quantity, c.total])).toEqual([
      ["Corte de pelo", 2, 24000],
      ["Corte + barba", 1, 18000],
    ]);
    expect(cortes.concepts[0].byMethod).toEqual({ efectivo: 12000, transferencia: 12000 });
  });

  it("el precio unitario queda en null si cambió dentro del período", () => {
    const groups = groupByCategory([
      charge({}),
      charge({ amount: 13000, unitPrice: 13000 }),
    ]);
    expect(groups[0].concepts[0].unitPrice).toBeNull();
    expect(groupByCategory([charge({}), charge({})])[0].concepts[0].unitPrice).toBe(12000);
  });

  it("sin movimientos no hay categorías, y la parte es 0 si el total es 0", () => {
    expect(groupByCategory([])).toEqual([]);
    expect(groupByCategory([charge({ amount: 0, unitPrice: 0 })])[0].share).toBe(0);
  });
});
