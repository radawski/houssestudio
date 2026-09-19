import { describe, expect, it } from "vitest";

import { summarizeCharges } from "@/lib/cashbox";

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
