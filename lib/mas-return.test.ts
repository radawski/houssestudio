import { describe, expect, it } from "vitest";

import { canGoBackToMas, isFreshReturn, trackNavigation, type NavTrack } from "@/lib/mas-return";

const START: NavTrack = { current: null, previous: null, viaPop: false };

/** Recorre una secuencia de navegaciones: [url, si fue con "atrás"]. */
function walk(...steps: [string, boolean][]): NavTrack {
  return steps.reduce((track, [url, viaPop]) => trackNavigation(track, url, viaPop), START);
}

describe("canGoBackToMas", () => {
  it("Más → Servicios hacia adelante: ← vuelve con el historial", () => {
    expect(canGoBackToMas(walk(["/admin/mas", false], ["/admin/servicios", false]))).toBe(true);
  });

  it("entrada directa por URL: navega como siempre", () => {
    expect(canGoBackToMas(walk(["/admin/servicios", false]))).toBe(false);
  });

  it("después de volver a Más con atrás, ir a otra fila sigue sirviendo", () => {
    const track = walk(
      ["/admin/mas", false],
      ["/admin/servicios", false],
      ["/admin/mas", true],
      ["/admin/productos", false],
    );
    expect(canGoBackToMas(track)).toBe(true);
  });

  it("Productos → detalle → lista con su ←: la anterior ya no es Más", () => {
    const track = walk(
      ["/admin/mas", false],
      ["/admin/productos", false],
      ["/admin/productos?categoria=1", false],
      ["/admin/productos", false],
    );
    expect(canGoBackToMas(track)).toBe(false);
  });

  it("si a esta pantalla se llegó con atrás, lo anterior en el historial puede no ser Más", () => {
    // Agenda → Servicios → Más → atrás a Servicios: antes de Servicios está Agenda.
    const track = walk(
      ["/admin/agenda", false],
      ["/admin/servicios", false],
      ["/admin/mas", false],
      ["/admin/servicios", true],
    );
    expect(canGoBackToMas(track)).toBe(false);
  });
});

describe("isFreshReturn", () => {
  it("marca la fila si el aviso es de recién", () => {
    expect(isFreshReturn(10_000, 10_500)).toBe(true);
  });

  it("un aviso viejo (se salió de Más antes de que se apagara) no marca nada", () => {
    expect(isFreshReturn(10_000, 30_000)).toBe(false);
  });
});
