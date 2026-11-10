import { describe, expect, it } from "vitest";

import {
  buildHeatmap,
  compareSeries,
  countOutcomes,
  describeBusiest,
  hourBands,
  latestWeekdayOnOrBefore,
  newVsReturning,
  percentChange,
  returnFrequency,
  sameWeekdaySeries,
  share,
  signed,
  type Visit,
} from "@/lib/stats";

describe("porcentajes", () => {
  it("variación contra el período anterior", () => {
    expect(percentChange(112, 100)).toBe(12);
    expect(percentChange(90, 100)).toBe(-10);
    expect(percentChange(50, 0)).toBeNull();
  });

  it("parte de un total", () => {
    expect(share(4, 106)).toBe(4);
    expect(share(0, 0)).toBe(0);
  });

  it("diferencias con signo, sin porcentaje", () => {
    expect(signed(3)).toBe("+3");
    expect(signed(-2)).toBe("−2");
    expect(signed(0)).toBe("=");
    expect(signed(-1500, (n) => `$ ${n}`)).toBe("−$ 1500");
  });
});

describe("turnos del período", () => {
  it("cuenta cada estado", () => {
    expect(
      countOutcomes(["completado", "completado", "cancelado", "no_show", "confirmado", "pendiente"]),
    ).toEqual({ total: 6, attended: 2, cancelled: 1, noShow: 1, open: 2 });
  });
});

describe("clientes", () => {
  const visits: Visit[] = [
    { customerId: "ana", dateKey: "2026-09-10" },
    { customerId: "ana", dateKey: "2026-10-05" },
    { customerId: "beto", dateKey: "2026-10-12" },
    { customerId: "beto", dateKey: "2026-10-26" },
    { customerId: "caro", dateKey: "2026-09-01" },
    { customerId: "dani", dateKey: "2026-11-02" },
  ];

  it("nuevos (primera visita en el período) y los que vuelven", () => {
    // Octubre: Ana ya había venido; Beto viene por primera vez (dos veces).
    expect(newVsReturning(visits, "2026-10-01", "2026-10-31")).toEqual({ nuevos: 1, vuelven: 1 });
    // Una visita posterior al período no cuenta.
    expect(newVsReturning(visits, "2026-11-01", "2026-11-30")).toEqual({ nuevos: 1, vuelven: 0 });
  });

  it("frecuencia de retorno de los clientes activos", () => {
    // Al 31/10: Ana cada 25 días, Beto cada 14. Caro tiene una sola visita.
    const result = returnFrequency(visits, "2026-10-31");
    expect(result.customers).toBe(2);
    expect(result.average).toBe(20); // (25 + 14) / 2 = 19,5
    expect(result.buckets.map((b) => b.count)).toEqual([1, 1, 0, 0, 0]);
  });

  it("deja afuera a quien no viene hace 60 días o más", () => {
    // Al 4/12 la última visita de Ana (5/10) fue hace 60 días.
    const result = returnFrequency(visits, "2026-12-04");
    expect(result.customers).toBe(1);
    expect(result.average).toBe(14);
  });

  it("sin clientes activos no hay promedio", () => {
    expect(returnFrequency([], "2026-10-31").average).toBeNull();
  });

  it("dos visitas el mismo día cuentan como una", () => {
    const same: Visit[] = [
      { customerId: "eli", dateKey: "2026-10-01" },
      { customerId: "eli", dateKey: "2026-10-01" },
    ];
    expect(returnFrequency(same, "2026-10-31").customers).toBe(0);
  });
});

describe("mismo día, semana a semana", () => {
  it("el último día de la semana pedido, hasta la fecha de referencia", () => {
    // 9/11/2026 es lunes.
    expect(latestWeekdayOnOrBefore("2026-11-09", 1)).toBe("2026-11-09");
    expect(latestWeekdayOnOrBefore("2026-11-09", 6)).toBe("2026-11-07");
    expect(latestWeekdayOnOrBefore("2026-11-09", 2)).toBe("2026-11-03");
  });

  it("serie de 8 semanas, la más reciente primero, con ceros donde no hubo nada", () => {
    const series = sameWeekdaySeries({ "2026-11-07": 5, "2026-10-31": 3 }, "2026-11-07");
    expect(series).toHaveLength(8);
    expect(series[0]).toEqual({ dateKey: "2026-11-07", value: 5 });
    expect(series[1]).toEqual({ dateKey: "2026-10-31", value: 3 });
    expect(series[7]).toEqual({ dateKey: "2026-09-19", value: 0 });
  });

  it("compara contra la semana anterior y el promedio de las anteriores", () => {
    const series = [10, 8, 6, 4].map((value, index) => ({ dateKey: String(index), value }));
    expect(compareSeries(series)).toEqual({ latest: 10, average: 6, vsPrevious: 2, vsAverage: 4 });
  });
});

describe("movimiento", () => {
  it("franjas de dos horas entre apertura y cierre", () => {
    expect(hourBands(12, 20)).toEqual([
      { from: 12, to: 14 },
      { from: 14, to: 16 },
      { from: 16, to: 18 },
      { from: 18, to: 20 },
    ]);
    expect(hourBands(9, 20).at(-1)).toEqual({ from: 19, to: 20 });
  });

  it("cuenta por día y franja, con tonos y el más lleno", () => {
    const bands = hourBands(12, 16);
    const map = buildHeatmap(
      [
        { weekday: 6, minutes: 12 * 60 },
        { weekday: 6, minutes: 13 * 60 + 30 },
        { weekday: 6, minutes: 14 * 60 },
        { weekday: 2, minutes: 15 * 60 },
        { weekday: 0, minutes: 12 * 60 }, // domingo: fuera de las columnas
      ],
      bands,
      [1, 2, 3, 4, 5, 6],
    );
    expect(map.rows[0].cells.map((c) => c.count)).toEqual([0, 0, 0, 0, 0, 2]);
    expect(map.rows[0].cells.map((c) => c.level)).toEqual([0, 0, 0, 0, 0, 4]);
    expect(map.rows[1].cells.map((c) => c.level)).toEqual([0, 2, 0, 0, 0, 2]);
    expect(map.busiest).toEqual({ weekday: 6, band: { from: 12, to: 14 }, count: 2 });
    expect(describeBusiest(map.busiest!)).toBe("sábados de 12 a 14");
  });

  it("sin turnos no hay más lleno", () => {
    expect(buildHeatmap([], hourBands(12, 20), [1, 2]).busiest).toBeNull();
  });
});
