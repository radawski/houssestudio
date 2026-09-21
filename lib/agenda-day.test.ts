import { describe, expect, it } from "vitest";

import { buildAgendaDayRows } from "@/lib/agenda-day";

type Fixture = { id: string; starts_at: string };

const appointment = (id: string, startsAt: string): Fixture => ({ id, starts_at: startsAt });

const gap = (start: string, end: string) => ({ start: new Date(start), end: new Date(end) });

describe("buildAgendaDayRows", () => {
  it("sin turnos ni huecos, la lista queda vacia", () => {
    expect(buildAgendaDayRows([], [])).toEqual([]);
  });

  it("intercala turnos y huecos por horario, sin importar el orden de entrada", () => {
    const rows = buildAgendaDayRows(
      [appointment("b", "2026-09-19T15:00:00.000Z"), appointment("a", "2026-09-19T13:00:00.000Z")],
      [gap("2026-09-19T14:00:00.000Z", "2026-09-19T14:45:00.000Z")],
    );

    expect(rows.map((row) => (row.kind === "appointment" ? row.appointment.id : "gap"))).toEqual([
      "a",
      "gap",
      "b",
    ]);
  });

  it("dos huecos y ningun turno tambien se ordenan", () => {
    const rows = buildAgendaDayRows(
      [],
      [gap("2026-09-19T18:00:00.000Z", "2026-09-19T19:00:00.000Z"), gap("2026-09-19T12:00:00.000Z", "2026-09-19T13:00:00.000Z")],
    );

    expect(rows).toEqual([
      { kind: "gap", start: new Date("2026-09-19T12:00:00.000Z"), end: new Date("2026-09-19T13:00:00.000Z") },
      { kind: "gap", start: new Date("2026-09-19T18:00:00.000Z"), end: new Date("2026-09-19T19:00:00.000Z") },
    ]);
  });
});
