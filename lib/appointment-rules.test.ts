import { describe, expect, it } from "vitest";

import { canMarkNoShow } from "@/lib/appointment-rules";

const STARTS_AT = new Date("2026-08-15T17:00:00.000Z");

describe("canMarkNoShow", () => {
  it("no permite marcar ausente antes de que arranque el turno", () => {
    const now = new Date("2026-08-15T16:59:59.999Z");
    expect(canMarkNoShow({ status: "confirmado", startsAt: STARTS_AT, now })).toBe(false);
  });

  it("permite marcar ausente justo cuando arranca el turno", () => {
    const now = new Date("2026-08-15T17:00:00.000Z");
    expect(canMarkNoShow({ status: "confirmado", startsAt: STARTS_AT, now })).toBe(true);
  });

  it("permite marcar ausente bien despues de que arranco", () => {
    const now = new Date("2026-08-15T20:00:00.000Z");
    expect(canMarkNoShow({ status: "confirmado", startsAt: STARTS_AT, now })).toBe(true);
  });

  it.each(["pendiente", "completado", "cancelado", "no_show"] as const)(
    "no permite marcar ausente un turno %s aunque ya haya pasado la hora",
    (status) => {
      const now = new Date("2026-08-15T20:00:00.000Z");
      expect(canMarkNoShow({ status, startsAt: STARTS_AT, now })).toBe(false);
    },
  );
});
