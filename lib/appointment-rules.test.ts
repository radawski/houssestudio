import { describe, expect, it } from "vitest";

import { canMarkNoShow, correctedPaidAt, restoreTarget } from "@/lib/appointment-rules";

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

describe("restoreTarget", () => {
  it("vuelve a confirmado un turno que estaba confirmado y canceló el peluquero", () => {
    expect(
      restoreTarget({ status: "cancelado", cancelledBy: "barbero", confirmedAt: "2026-08-10T12:00:00.000Z" }),
    ).toBe("confirmado");
  });

  it("vuelve a pendiente una solicitud rechazada", () => {
    expect(restoreTarget({ status: "cancelado", cancelledBy: "barbero", confirmedAt: null })).toBe("pendiente");
  });

  it("no restaura lo que canceló el cliente", () => {
    expect(
      restoreTarget({ status: "cancelado", cancelledBy: "cliente", confirmedAt: "2026-08-10T12:00:00.000Z" }),
    ).toBeNull();
  });

  it.each(["pendiente", "confirmado", "completado", "no_show"] as const)("no restaura un turno %s", (status) => {
    expect(restoreTarget({ status, cancelledBy: null, confirmedAt: null })).toBeNull();
  });
});

describe("correctedPaidAt", () => {
  // Cobro original: 15/8 a las 20:30 en Buenos Aires (UTC-3).
  const ORIGINAL = "2026-08-15T23:30:45.000Z";
  const NOW = new Date("2026-08-16T13:00:00.000Z"); // 16/8, 10:00 local

  it("deja el instante original si el día no cambia", () => {
    expect(correctedPaidAt({ originalPaidAt: ORIGINAL, paidOn: "2026-08-15", now: NOW })?.toISOString()).toBe(ORIGINAL);
  });

  it("pasa el cobro a otro día con la misma hora local", () => {
    expect(correctedPaidAt({ originalPaidAt: ORIGINAL, paidOn: "2026-08-14", now: NOW })?.toISOString()).toBe(
      "2026-08-14T23:30:00.000Z",
    );
  });

  it("usa ahora si la hora original de hoy todavía no llegó", () => {
    expect(correctedPaidAt({ originalPaidAt: ORIGINAL, paidOn: "2026-08-16", now: NOW })?.toISOString()).toBe(
      NOW.toISOString(),
    );
  });

  it("rechaza un día futuro", () => {
    expect(correctedPaidAt({ originalPaidAt: ORIGINAL, paidOn: "2026-08-17", now: NOW })).toBeNull();
  });
});
