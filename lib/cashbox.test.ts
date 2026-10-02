import { describe, expect, it } from "vitest";

import {
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
