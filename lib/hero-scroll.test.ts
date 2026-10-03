import { describe, expect, it } from "vitest";

import { heroIsBehind, scrollAfterHeroRemoval } from "@/lib/hero-scroll";

describe("heroIsBehind", () => {
  it("es verdadero cuando el borde inferior de la portada ya salió por arriba", () => {
    expect(heroIsBehind(-120)).toBe(true);
  });

  it("es verdadero con la portada justo en el borde (el camino del botón)", () => {
    expect(heroIsBehind(0)).toBe(true);
  });

  it("tolera el redondeo de subpíxeles del desplazamiento suave", () => {
    expect(heroIsBehind(1.5)).toBe(true);
  });

  it("es falso si todavía se ve una franja de la portada", () => {
    expect(heroIsBehind(40)).toBe(false);
  });
});

describe("scrollAfterHeroRemoval", () => {
  it("con el stepper arriba de todo (botón) deja el scroll en 0", () => {
    expect(scrollAfterHeroRemoval(844, 844)).toBe(0);
  });

  it("con scroll manual más abajo conserva la posición del contenido", () => {
    expect(scrollAfterHeroRemoval(1300, 844)).toBe(456);
  });

  it("nunca devuelve un scroll negativo", () => {
    expect(scrollAfterHeroRemoval(842, 844)).toBe(0);
  });
});
