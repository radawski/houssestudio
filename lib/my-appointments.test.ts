import { describe, expect, it } from "vitest";

import { PAST_LIMIT, firstName, phonesMatch, splitMyAppointments } from "@/lib/my-appointments";

describe("phonesMatch", () => {
  const REGISTERED = "3425972035";

  it("acepta el mismo número escrito de distintas formas", () => {
    expect(phonesMatch("342 597 2035", REGISTERED)).toBe(true);
    expect(phonesMatch("0342 15 597-2035", REGISTERED)).toBe(true);
    expect(phonesMatch("+54 9 342 597 2035", REGISTERED)).toBe(true);
  });

  it("rechaza otro número", () => {
    expect(phonesMatch("342 597 2036", REGISTERED)).toBe(false);
  });

  it("rechaza un número que no se puede interpretar", () => {
    expect(phonesMatch("12345", REGISTERED)).toBe(false);
    expect(phonesMatch("", REGISTERED)).toBe(false);
  });

  it("compara contra la ficha aunque esté guardada con prefijos", () => {
    expect(phonesMatch("3425972035", "+54 9 342 15 597-2035")).toBe(true);
  });

  it("funciona con un número de otra zona cargado en la ficha", () => {
    expect(phonesMatch("011 15 2345-6789", "1123456789")).toBe(true);
  });
});

describe("firstName", () => {
  it("devuelve el primer nombre", () => {
    expect(firstName("Matías Correa")).toBe("Matías");
    expect(firstName("  Ana  ")).toBe("Ana");
  });
});

describe("splitMyAppointments", () => {
  const NOW = new Date("2026-11-10T15:00:00.000Z");
  const at = (start: string, end: string) => ({ starts_at: start, ends_at: end });

  it("separa próximos y anteriores, ordenados", () => {
    const later = at("2026-11-13T21:30:00.000Z", "2026-11-13T22:15:00.000Z");
    const soon = at("2026-11-11T20:00:00.000Z", "2026-11-11T20:45:00.000Z");
    const old = at("2026-10-14T13:30:00.000Z", "2026-10-14T14:15:00.000Z");
    const recent = at("2026-11-03T21:30:00.000Z", "2026-11-03T22:15:00.000Z");

    const { upcoming, past } = splitMyAppointments([later, old, soon, recent], NOW);

    expect(upcoming).toEqual([soon, later]);
    expect(past).toEqual([recent, old]);
  });

  it("un turno en curso cuenta como próximo", () => {
    const ongoing = at("2026-11-10T14:45:00.000Z", "2026-11-10T15:30:00.000Z");
    expect(splitMyAppointments([ongoing], NOW).upcoming).toEqual([ongoing]);
  });

  it("limita los anteriores", () => {
    const past = Array.from({ length: PAST_LIMIT + 3 }, (_, i) =>
      at(`2026-10-0${i + 1}T13:00:00.000Z`, `2026-10-0${i + 1}T13:45:00.000Z`),
    );
    expect(splitMyAppointments(past, NOW).past).toHaveLength(PAST_LIMIT);
  });
});
