import { describe, expect, it } from "vitest";

import { exactMonthRange, monthDateKeys, toDateKey } from "@/lib/dates";

describe("exactMonthRange", () => {
  it("no incluye días del mes anterior, a diferencia de la grilla visual de monthRange", () => {
    const { start } = exactMonthRange("2026-08-15");
    expect(toDateKey(start)).toBe("2026-08-01");
  });

  it("no incluye días del mes siguiente aunque el último caiga a mitad de semana", () => {
    const { end } = exactMonthRange("2026-08-15");
    // `end` es el instante exclusivo del final: la medianoche del 1° de
    // septiembre, no el 31 de agosto a las 23:59.
    expect(toDateKey(end)).toBe("2026-09-01");
  });

  it("devuelve la clave de mes correcta", () => {
    expect(exactMonthRange("2026-08-15").monthKey).toBe("2026-08");
  });

  it("funciona igual para un mes que empieza un lunes", () => {
    // Junio de 2026 empieza un lunes: sin relleno de todos modos, pero sirve
    // de control para no depender de un solo caso.
    const { start, end } = exactMonthRange("2026-06-10");
    expect(toDateKey(start)).toBe("2026-06-01");
    expect(toDateKey(end)).toBe("2026-07-01");
  });
});

describe("monthDateKeys", () => {
  it("devuelve exactamente los dias del mes, sin relleno de otro mes", () => {
    const days = monthDateKeys("2026-09");
    expect(days).toHaveLength(30);
    expect(days[0]).toBe("2026-09-01");
    expect(days[29]).toBe("2026-09-30");
  });

  it("respeta un mes de 31 dias y uno de 28 (no bisiesto)", () => {
    expect(monthDateKeys("2026-08")).toHaveLength(31);
    expect(monthDateKeys("2026-02")).toHaveLength(28);
  });
});
