import { describe, expect, it, vi } from "vitest";

import { runIsolated } from "@/lib/cron";

describe("runIsolated", () => {
  it("devuelve el resumen del trabajo cuando sale bien", async () => {
    await expect(runIsolated("vuelta", async () => ({ enviado: 2 }))).resolves.toEqual({ enviado: 2 });
  });

  it("si el trabajo falla no lanza: devuelve el error para el resumen y lo deja en el log", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await runIsolated("vuelta", async () => {
      throw new Error("Supabase caído");
    });
    expect(result).toEqual({ error: "Supabase caído" });
    expect(log).toHaveBeenCalledWith(expect.stringContaining("vuelta"));
    log.mockRestore();
  });

  it("un trabajo que falla no impide correr el siguiente", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const second = vi.fn(async () => ({ enviado: 1 }));
    await runIsolated("recordatorios", async () => {
      throw new Error("boom");
    });
    await runIsolated("vuelta", second);
    expect(second).toHaveBeenCalled();
    vi.restoreAllMocks();
  });
});
