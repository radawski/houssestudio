import { describe, expect, it } from "vitest";

import { businessTimeToDate } from "@/lib/availability";
import {
  describeFrequency,
  describeSlot,
  listDates,
  nthOfMonth,
  nthWeekdayOfMonth,
  occurrenceDates,
  occurrenceProblem,
  ruleFromChoice,
  weekdayOfKey,
} from "@/lib/recurring";

describe("fechas de un turno fijo", () => {
  it("cada semana y cada 2 semanas desde la primera fecha", () => {
    // 11/11/2026 es miércoles.
    expect(weekdayOfKey("2026-11-11")).toBe(3);
    const weekly = ruleFromChoice("1", "2026-11-11")!;
    expect(occurrenceDates(weekly, "2026-11-11", 4)).toEqual([
      "2026-11-11",
      "2026-11-18",
      "2026-11-25",
      "2026-12-02",
    ]);
    const biweekly = ruleFromChoice("2", "2026-11-11")!;
    expect(occurrenceDates(biweekly, "2026-11-11", 4)).toEqual([
      "2026-11-11",
      "2026-11-25",
      "2026-12-09",
      "2026-12-23",
    ]);
  });

  it("desde una fecha posterior mantiene el ritmo de la regla", () => {
    const every3 = ruleFromChoice("3", "2026-11-11")!;
    // 12/11 cae entre el 11/11 y el 2/12: la siguiente es el 2/12.
    expect(occurrenceDates(every3, "2026-11-12", 2)).toEqual(["2026-12-02", "2026-12-23"]);
    // Justo en una fecha de la regla, esa entra.
    expect(occurrenceDates(every3, "2026-12-02", 1)).toEqual(["2026-12-02"]);
    // Nunca antes de la primera fecha.
    expect(occurrenceDates(every3, "2026-10-01", 1)).toEqual(["2026-11-11"]);
  });

  it("cruza el fin de año sin correrse", () => {
    const weekly = ruleFromChoice("1", "2026-12-23")!;
    expect(occurrenceDates(weekly, "2026-12-23", 3)).toEqual(["2026-12-23", "2026-12-30", "2027-01-06"]);
  });

  it("cada mes: el mismo n-ésimo día de la semana", () => {
    expect(nthOfMonth("2026-11-11")).toBe(2);
    const monthly = ruleFromChoice("mes", "2026-11-11")!;
    expect(monthly.monthlyNth).toBe(2);
    expect(occurrenceDates(monthly, "2026-11-11", 4)).toEqual([
      "2026-11-11",
      "2026-12-09",
      "2027-01-13",
      "2027-02-10",
    ]);
  });

  it("cada mes desde una fecha posterior a la del mes", () => {
    const monthly = ruleFromChoice("mes", "2026-11-11")!;
    // El 2° miércoles de diciembre es el 9: desde el 10 sigue enero.
    expect(occurrenceDates(monthly, "2026-12-10", 1)).toEqual(["2027-01-13"]);
  });

  it("un quinto día de la semana pasa a ser el último en los meses que no lo tienen", () => {
    // 30/12/2026 es el 5° miércoles; enero 2027 no tiene quinto miércoles.
    expect(nthOfMonth("2026-12-30")).toBe(5);
    expect(nthWeekdayOfMonth(2027, 1, 3, 5)).toBe("2027-01-27");
    const monthly = ruleFromChoice("mes", "2026-12-30")!;
    expect(occurrenceDates(monthly, "2026-12-30", 4)).toEqual([
      "2026-12-30",
      "2027-01-27",
      "2027-02-24",
      "2027-03-31",
    ]);
  });

  it("'No' no arma regla", () => {
    expect(ruleFromChoice("no", "2026-11-11")).toBeNull();
  });
});

describe("textos", () => {
  it("describe la frecuencia y el horario", () => {
    expect(describeFrequency(ruleFromChoice("1", "2026-11-11")!)).toBe("Cada semana");
    expect(describeFrequency(ruleFromChoice("2", "2026-11-11")!)).toBe("Cada 2 semanas");
    expect(describeFrequency(ruleFromChoice("mes", "2026-11-11")!)).toBe("Cada mes · 2° miércoles");
    expect(describeFrequency(ruleFromChoice("mes", "2026-12-30")!)).toBe("Cada mes · último miércoles");
    expect(describeSlot(ruleFromChoice("1", "2026-11-11")!, "17:00:00")).toBe("Miércoles 17:00");
  });

  it("lista las fechas cortas", () => {
    expect(listDates(["2026-11-11"])).toBe("11/11");
    expect(listDates(["2026-11-11", "2026-11-25", "2026-12-09", "2026-12-23"])).toBe(
      "11/11, 25/11, 9/12 y 23/12",
    );
  });
});

describe("si una fecha entra en la agenda", () => {
  const dateKey = "2026-11-25";
  const at = (time: string) => businessTimeToDate(dateKey, time);
  const slot = { start: at("17:00"), end: at("17:45") };
  const hours = {
    isClosed: false,
    ranges: [
      { opensAt: "09:00", closesAt: "13:00" },
      { opensAt: "16:00", closesAt: "20:00" },
    ],
  };

  it("entra si cae en horario y no pisa nada", () => {
    expect(occurrenceProblem({ dateKey, slot, hours, blocks: [], taken: [] })).toBeNull();
    // Un turno que termina justo cuando empieza no molesta.
    expect(
      occurrenceProblem({ dateKey, slot, hours, blocks: [], taken: [{ start: at("16:15"), end: at("17:00") }] }),
    ).toBeNull();
  });

  it("cerrado o fuera de horario", () => {
    expect(occurrenceProblem({ dateKey, slot, hours: null, blocks: [], taken: [] })).toBe(
      "El local está cerrado ese día.",
    );
    expect(occurrenceProblem({ dateKey, slot, hours: { ...hours, isClosed: true }, blocks: [], taken: [] })).toBe(
      "El local está cerrado ese día.",
    );
    const late = { start: at("19:30"), end: at("20:15") };
    expect(occurrenceProblem({ dateKey, slot: late, hours, blocks: [], taken: [] })).toBe(
      "Queda fuera del horario de atención.",
    );
    // Cruza el corte del mediodía.
    const lunch = { start: at("12:30"), end: at("13:15") };
    expect(occurrenceProblem({ dateKey, slot: lunch, hours, blocks: [], taken: [] })).toBe(
      "Queda fuera del horario de atención.",
    );
  });

  it("bloqueado (con su motivo) u ocupado", () => {
    const block = { start: at("00:00"), end: at("23:59"), reason: "Vacaciones" };
    expect(occurrenceProblem({ dateKey, slot, hours, blocks: [block], taken: [] })).toBe(
      "El horario está bloqueado (“Vacaciones”).",
    );
    expect(occurrenceProblem({ dateKey, slot, hours, blocks: [{ ...block, reason: null }], taken: [] })).toBe(
      "El horario está bloqueado.",
    );
    expect(
      occurrenceProblem({ dateKey, slot, hours, blocks: [], taken: [{ start: at("17:30"), end: at("18:15") }] }),
    ).toBe("Ya hay otro turno en ese horario.");
  });
});
