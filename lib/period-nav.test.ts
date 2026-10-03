import { describe, expect, it } from "vitest";

import { periodContainsToday, periodHref, periodTitle, stepDateKey, stepFrom } from "@/lib/period-nav";

describe("periodTitle", () => {
  it("día: día de la semana, número y mes", () => {
    expect(periodTitle("dia", "2026-09-19")).toBe("sábado 19 de septiembre");
  });

  it("semana: de lunes a domingo de la semana que contiene la fecha", () => {
    expect(periodTitle("semana", "2026-09-19")).toBe("14 de septiembre – 20 de septiembre");
  });

  it("semana que cruza de mes", () => {
    expect(periodTitle("semana", "2026-10-01")).toBe("28 de septiembre – 4 de octubre");
  });

  it("mes: nombre del mes y año", () => {
    expect(periodTitle("mes", "2026-09-19")).toBe("septiembre 2026");
  });
});

describe("stepDateKey", () => {
  it("día: ±1", () => {
    expect(stepDateKey("dia", "2026-09-19", 1)).toBe("2026-09-20");
    expect(stepDateKey("dia", "2026-09-19", -1)).toBe("2026-09-18");
  });

  it("encadena toques seguidos desde la fecha ya avanzada", () => {
    const afterThree = [1, 1, 1].reduce((key, direction) => stepDateKey("dia", key, direction as 1), "2026-09-19");
    expect(afterThree).toBe("2026-09-22");
  });

  it("semana: ±7", () => {
    expect(stepDateKey("semana", "2026-09-19", 1)).toBe("2026-09-26");
  });

  it("cruza de mes y de año", () => {
    expect(stepDateKey("dia", "2026-12-31", 1)).toBe("2027-01-01");
  });

  it("mes: va al día 1 del mes siguiente (diseño AgendaPeriodoMes)", () => {
    expect(stepDateKey("mes", "2026-09-19", 1)).toBe("2026-10-01");
  });

  it("mes: va al día 1 del mes anterior", () => {
    expect(stepDateKey("mes", "2026-09-19", -1)).toBe("2026-08-01");
  });

  it("mes: desde el 31 de enero no se saltea febrero", () => {
    expect(stepDateKey("mes", "2027-01-31", 1)).toBe("2027-02-01");
  });

  it("mes: cruza de año en los dos sentidos", () => {
    expect(stepDateKey("mes", "2026-12-15", 1)).toBe("2027-01-01");
    expect(stepDateKey("mes", "2027-01-15", -1)).toBe("2026-12-01");
  });
});

describe("periodContainsToday", () => {
  const today = "2026-09-08"; // martes

  it("día: solo el mismo día", () => {
    expect(periodContainsToday("dia", "2026-09-08", today)).toBe(true);
    expect(periodContainsToday("dia", "2026-09-09", today)).toBe(false);
  });

  it("semana: cualquier día de la semana de hoy (lunes a domingo)", () => {
    expect(periodContainsToday("semana", "2026-09-07", today)).toBe(true);
    expect(periodContainsToday("semana", "2026-09-13", today)).toBe(true);
    expect(periodContainsToday("semana", "2026-09-14", today)).toBe(false);
    expect(periodContainsToday("semana", "2026-09-06", today)).toBe(false);
  });

  it("mes: cualquier día del mes de hoy", () => {
    expect(periodContainsToday("mes", "2026-09-30", today)).toBe(true);
    expect(periodContainsToday("mes", "2026-10-01", today)).toBe(false);
  });

  it("mes: el mismo mes de otro año no cuenta", () => {
    expect(periodContainsToday("mes", "2027-09-08", today)).toBe(false);
  });
});

describe("periodHref", () => {
  it("arma la URL con vista y fecha", () => {
    expect(periodHref("/admin/agenda", "semana", "2026-09-19")).toBe("/admin/agenda?vista=semana&fecha=2026-09-19");
  });

  it("sirve también para Caja", () => {
    expect(periodHref("/admin/caja", "dia", "2026-09-19")).toBe("/admin/caja?vista=dia&fecha=2026-09-19");
  });
});

describe("stepFrom", () => {
  it("dos ▶ encadenados desde la última posición avanzan dos días", () => {
    const start = { view: "dia" as const, dateKey: "2026-09-20" };
    expect(stepFrom(1)(stepFrom(1)(start))).toEqual({ view: "dia", dateKey: "2026-09-22" });
  });

  it("conserva la vista y usa su paso", () => {
    expect(stepFrom(-1)({ view: "mes", dateKey: "2026-09-20" })).toEqual({ view: "mes", dateKey: "2026-08-01" });
  });
});
