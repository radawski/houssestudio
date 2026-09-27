import { describe, expect, it } from "vitest";

import { friendlyErrorMessage } from "@/lib/error-message";

const FALLBACK = "No se pudo aceptar el turno.";

describe("friendlyErrorMessage", () => {
  it("deja tal cual un mensaje propio en español", () => {
    expect(friendlyErrorMessage(new Error("El turno ya fue cancelado."), FALLBACK)).toBe(
      "El turno ya fue cancelado.",
    );
  });

  it("reemplaza los errores de red de Chrome y de Safari", () => {
    for (const message of ["Failed to fetch", "Load failed", "NetworkError when attempting to fetch resource."]) {
      expect(friendlyErrorMessage(new TypeError(message), FALLBACK)).toBe(
        "No se pudo aceptar el turno. Revisá la conexión.",
      );
    }
  });

  it("reemplaza el mensaje genérico que Next deja en producción", () => {
    const masked = new Error(
      "An error occurred in the Server Components render. The specific message is omitted in production builds.",
    );
    expect(friendlyErrorMessage(masked, FALLBACK)).toBe(
      "No se pudo aceptar el turno. Revisá la conexión.",
    );
  });

  it("usa el texto de respaldo si no hay un Error o viene vacío", () => {
    expect(friendlyErrorMessage("algo", FALLBACK)).toContain(FALLBACK);
    expect(friendlyErrorMessage(new Error("   "), FALLBACK)).toContain(FALLBACK);
  });
});
