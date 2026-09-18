import { describe, expect, it } from "vitest";

import { canCancel, cancelAffordance, cancellationDeadline } from "@/lib/cancellation";

const STARTS_AT = new Date("2026-08-15T17:00:00.000Z"); // turno a las 17:00 UTC
const WINDOW_HOURS = 2;

describe("cancellationDeadline", () => {
  it("resta la ventana al inicio del turno", () => {
    expect(cancellationDeadline(STARTS_AT, WINDOW_HOURS)).toEqual(
      new Date("2026-08-15T15:00:00.000Z"),
    );
  });
});

describe("canCancel", () => {
  it("permite cancelar justo antes del límite", () => {
    const now = new Date("2026-08-15T14:59:59.999Z");
    expect(canCancel({ status: "confirmado", startsAt: STARTS_AT, windowHours: WINDOW_HOURS, now })).toBe(
      true,
    );
  });

  it("no permite cancelar exactamente en el límite", () => {
    const now = new Date("2026-08-15T15:00:00.000Z");
    expect(canCancel({ status: "confirmado", startsAt: STARTS_AT, windowHours: WINDOW_HOURS, now })).toBe(
      false,
    );
  });

  it("no permite cancelar después del límite", () => {
    const now = new Date("2026-08-15T15:00:00.001Z");
    expect(canCancel({ status: "pendiente", startsAt: STARTS_AT, windowHours: WINDOW_HOURS, now })).toBe(
      false,
    );
  });

  it.each(["completado", "cancelado", "no_show"] as const)(
    "no permite cancelar un turno %s aunque esté dentro de la ventana",
    (status) => {
      const now = new Date("2026-08-15T10:00:00.000Z");
      expect(canCancel({ status, startsAt: STARTS_AT, windowHours: WINDOW_HOURS, now })).toBe(false);
    },
  );

  it.each(["pendiente", "confirmado"] as const)(
    "permite cancelar un turno %s dentro de la ventana",
    (status) => {
      const now = new Date("2026-08-15T10:00:00.000Z");
      expect(canCancel({ status, startsAt: STARTS_AT, windowHours: WINDOW_HOURS, now })).toBe(true);
    },
  );
});

describe("cancelAffordance", () => {
  it("ofrece el botón dentro de la ventana", () => {
    const now = new Date("2026-08-15T10:00:00.000Z");
    expect(
      cancelAffordance({ status: "confirmado", startsAt: STARTS_AT, windowHours: WINDOW_HOURS, now }),
    ).toBe("boton");
  });

  it("ofrece coordinar por WhatsApp fuera de la ventana, sin ocultar todo", () => {
    const now = new Date("2026-08-15T15:00:00.001Z");
    expect(
      cancelAffordance({ status: "pendiente", startsAt: STARTS_AT, windowHours: WINDOW_HOURS, now }),
    ).toBe("coordinar");
  });

  it.each(["completado", "cancelado", "no_show"] as const)(
    "no ofrece nada para un turno %s, sin importar la hora",
    (status) => {
      const now = new Date("2026-08-15T10:00:00.000Z");
      expect(
        cancelAffordance({ status, startsAt: STARTS_AT, windowHours: WINDOW_HOURS, now }),
      ).toBe("ninguna");
    },
  );
});
