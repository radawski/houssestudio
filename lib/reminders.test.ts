import { describe, expect, it } from "vitest";

import { pickReminders, tomorrowRange } from "@/lib/reminders";

describe("tomorrowRange", () => {
  it("es el día siguiente completo en hora de Buenos Aires", () => {
    // Martes 6 de octubre de 2026, 10:15 en Buenos Aires (13:15 UTC).
    const { start, end, dateKey } = tomorrowRange(new Date("2026-10-06T13:15:00Z"));
    expect(dateKey).toBe("2026-10-07");
    expect(start.toISOString()).toBe("2026-10-07T03:00:00.000Z");
    expect(end.toISOString()).toBe("2026-10-08T03:00:00.000Z");
  });

  it("cerca de medianoche cuenta el día local, no el de UTC", () => {
    // 23:30 del 6 en Buenos Aires ya es el 7 en UTC: mañana sigue siendo el 7.
    expect(tomorrowRange(new Date("2026-10-07T02:30:00Z")).dateKey).toBe("2026-10-07");
  });
});

describe("pickReminders", () => {
  const base = { status: "confirmado", email: "ana@example.com", alreadyReminded: false };

  it("solo confirmados, con email y sin recordatorio previo", () => {
    const { send, skipped } = pickReminders([
      { ...base, id: "ok" },
      { ...base, id: "pendiente", status: "pendiente" },
      { ...base, id: "cancelado", status: "cancelado" },
      { ...base, id: "sin-email", email: null },
      { ...base, id: "email-vacio", email: "  " },
      { ...base, id: "ya-avisado", alreadyReminded: true },
    ]);
    expect(send.map((c) => c.id)).toEqual(["ok"]);
    expect(skipped).toBe(5);
  });
});
