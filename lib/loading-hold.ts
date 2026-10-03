/**
 * Tiempos del esqueleto de carga (diseño "Estados de carga — Admin", regla 4):
 * aparece recién a los 200 ms, así una respuesta rápida pasa directo al
 * contenido sin parpadeo; y una vez visible dura al menos 400 ms, para que no
 * se vea un destello de barras.
 *
 * Los 200 ms los pone el CSS (`.hs-reveal-delayed`): el esqueleto se monta al
 * tocar pero recién se ve después. Este reductor decide, con los avisos de
 * dos temporizadores, cuándo sostenerlo aunque los datos ya hayan llegado.
 */

export const SKELETON_DELAY_MS = 200;
export const SKELETON_MIN_MS = 400;

/**
 * - `idle`: sin navegación en curso (o ya cumplido el mínimo).
 * - `waiting`: se tocó, todavía no pasaron los 200 ms.
 * - `shown`: el esqueleto ya se vio y todavía no cumplió los 400 ms.
 */
export type HoldPhase = "idle" | "waiting" | "shown";

export type HoldEvent =
  | { type: "start" }
  /** Pasaron los 200 ms; `loading` dice si los datos todavía no llegaron. */
  | { type: "delayElapsed"; loading: boolean }
  /** Pasaron 200 + 400 ms desde el toque. */
  | { type: "minElapsed" };

export function holdReducer(phase: HoldPhase, event: HoldEvent): HoldPhase {
  switch (event.type) {
    case "start":
      // Un toque nuevo con las barras a la vista no las esconde: el mínimo
      // vuelve a contar desde este toque.
      return phase === "shown" ? "shown" : "waiting";
    case "delayElapsed":
      if (phase !== "waiting") return phase;
      return event.loading ? "shown" : "idle";
    case "minElapsed":
      return "idle";
  }
}

export function showSkeleton(loading: boolean, phase: HoldPhase): boolean {
  return loading || phase === "shown";
}
