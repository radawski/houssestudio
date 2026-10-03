import { describe, expect, it } from "vitest";

import { agendaHref, agendaTitle, stepDateKey } from "@/lib/agenda-nav";

describe("agendaTitle", () => {
  it("día: día de la semana, número y mes", () => {
    expect(agendaTitle("dia", "2026-09-19")).toBe("sábado 19 de septiembre");
  });

  it("semana: de lunes a domingo de la semana que contiene la fecha", () => {
    expect(agendaTitle("semana", "2026-09-19")).toBe("14 de septiembre – 20 de septiembre");
  });

  it("semana que cruza de mes", () => {
    expect(agendaTitle("semana", "2026-10-01")).toBe("28 de septiembre – 4 de octubre");
  });

  it("mes: nombre del mes y año", () => {
    expect(agendaTitle("mes", "2026-09-19")).toBe("septiembre 2026");
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
});

describe("agendaHref", () => {
  it("arma la URL con vista y fecha", () => {
    expect(agendaHref("semana", "2026-09-19")).toBe("/admin/agenda?vista=semana&fecha=2026-09-19");
  });
});
