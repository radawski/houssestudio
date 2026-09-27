import { describe, expect, it } from "vitest";

import { formatDayAndTime, formatDni } from "@/lib/format";

describe("formatDni", () => {
  it("agrupa de a tres con punto", () => {
    expect(formatDni("44306546")).toBe("44.306.546");
    expect(formatDni("5123456")).toBe("5.123.456");
  });

  it("deja tal cual lo que no son solo dígitos", () => {
    expect(formatDni("44.306.546")).toBe("44.306.546");
    expect(formatDni("")).toBe("");
  });
});

describe("formatDayAndTime", () => {
  it("día de la semana, número y hora en la zona del local", () => {
    // 17:15 UTC = 14:15 en Buenos Aires.
    expect(formatDayAndTime("2026-09-25T17:15:00Z")).toBe("viernes 25, 14:15");
  });
});
