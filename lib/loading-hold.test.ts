import { describe, expect, it } from "vitest";

import { holdReducer, showSkeleton, type HoldPhase } from "@/lib/loading-hold";

/** Corre una secuencia de eventos desde `idle`. */
function run(...events: Parameters<typeof holdReducer>[1][]): HoldPhase {
  return events.reduce<HoldPhase>(holdReducer, "idle");
}

describe("holdReducer + showSkeleton", () => {
  it("al tocar, el esqueleto se monta enseguida (el CSS lo deja invisible 200 ms)", () => {
    expect(showSkeleton(true, run({ type: "start" }))).toBe(true);
  });

  it("si los datos llegan antes de los 200 ms, va directo al contenido y no parpadea después", () => {
    // Llegaron a los 120 ms: a los 200 ms ya no hay carga.
    const phase = run({ type: "start" }, { type: "delayElapsed", loading: false });
    expect(showSkeleton(false, phase)).toBe(false);
  });

  it("si a los 200 ms sigue cargando, el esqueleto queda visible", () => {
    const phase = run({ type: "start" }, { type: "delayElapsed", loading: true });
    expect(showSkeleton(true, phase)).toBe(true);
  });

  it("una vez visible, se sostiene aunque los datos lleguen enseguida (a los 300 ms)", () => {
    const phase = run({ type: "start" }, { type: "delayElapsed", loading: true });
    expect(showSkeleton(false, phase)).toBe(true);
  });

  it("a los 600 ms (200 + 400) se suelta y se ve el contenido", () => {
    const phase = run({ type: "start" }, { type: "delayElapsed", loading: true }, { type: "minElapsed" });
    expect(showSkeleton(false, phase)).toBe(false);
  });

  it("si la carga dura más que el mínimo, manda la carga", () => {
    const phase = run({ type: "start" }, { type: "delayElapsed", loading: true }, { type: "minElapsed" });
    expect(showSkeleton(true, phase)).toBe(true);
  });

  it("un toque nuevo con el esqueleto ya visible no lo vuelve a esconder", () => {
    const phase = run({ type: "start" }, { type: "delayElapsed", loading: true }, { type: "start" });
    expect(phase).toBe("shown");
  });

  it("sin navegación en curso no hay esqueleto", () => {
    expect(showSkeleton(false, "idle")).toBe(false);
  });
});
