import { describe, expect, it } from "vitest";

import { overlayOpacity, shouldDismiss, startsDrag } from "@/lib/sheet-drag";

describe("startsDrag", () => {
  it("arranca con un movimiento hacia abajo, más vertical que horizontal", () => {
    expect(startsDrag(2, 12)).toBe(true);
  });

  it("no arranca hacia arriba, de costado ni por un roce", () => {
    expect(startsDrag(0, -20)).toBe(false);
    expect(startsDrag(30, 12)).toBe(false);
    expect(startsDrag(0, 5)).toBe(false);
  });
});

describe("shouldDismiss", () => {
  it("cierra si se bajó lo suficiente", () => {
    expect(shouldDismiss({ distance: 130, velocity: 0.1, sheetHeight: 700 })).toBe(true);
  });

  it("en una hoja baja alcanza con un cuarto de su altura", () => {
    expect(shouldDismiss({ distance: 80, velocity: 0.1, sheetHeight: 300 })).toBe(true);
    expect(shouldDismiss({ distance: 70, velocity: 0.1, sheetHeight: 300 })).toBe(false);
  });

  it("cierra con un tirón rápido aunque sea corto", () => {
    expect(shouldDismiss({ distance: 50, velocity: 0.9, sheetHeight: 700 })).toBe(true);
  });

  it("vuelve a su lugar si fue poco y lento, o un roce rápido", () => {
    expect(shouldDismiss({ distance: 60, velocity: 0.2, sheetHeight: 700 })).toBe(false);
    expect(shouldDismiss({ distance: 20, velocity: 2, sheetHeight: 700 })).toBe(false);
  });
});

describe("overlayOpacity", () => {
  it("se aclara en proporción a lo que bajó la hoja", () => {
    expect(overlayOpacity(0, 600)).toBe(1);
    expect(overlayOpacity(300, 600)).toBe(0.5);
    expect(overlayOpacity(900, 600)).toBe(0);
  });

  it("no se rompe con una hoja sin altura", () => {
    expect(overlayOpacity(50, 0)).toBe(1);
  });
});
