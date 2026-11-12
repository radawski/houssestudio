import { describe, expect, it, vi } from "vitest";

import { createRetryFetch } from "@/lib/supabase/retry-fetch";

const futureToken = () =>
  new Response(JSON.stringify({ code: "PGRST303", message: "JWT issued at future" }), { status: 401 });
const ok = () => new Response("[]", { status: 200 });
const noWait = () => Promise.resolve();

describe("createRetryFetch", () => {
  it("devuelve la respuesta tal cual cuando no hay rechazo", async () => {
    const base = vi.fn().mockResolvedValue(ok());
    const response = await createRetryFetch(base, noWait)("https://x.test/rest/v1/appointments");
    expect(response.status).toBe(200);
    expect(base).toHaveBeenCalledTimes(1);
  });

  it("reintenta el token 'del futuro' hasta que la API lo acepta", async () => {
    const base = vi.fn().mockResolvedValueOnce(futureToken()).mockResolvedValueOnce(futureToken()).mockResolvedValue(ok());
    const wait = vi.fn(noWait);
    const response = await createRetryFetch(base, wait)("https://x.test/rest/v1/appointments", { method: "GET" });
    expect(response.status).toBe(200);
    expect(base).toHaveBeenCalledTimes(3);
    expect(wait).toHaveBeenCalledTimes(2);
  });

  it("se rinde después de tres reintentos y devuelve el 401", async () => {
    const base = vi.fn().mockImplementation(async () => futureToken());
    const response = await createRetryFetch(base, noWait)("https://x.test/rest/v1/appointments");
    expect(response.status).toBe(401);
    expect(base).toHaveBeenCalledTimes(4);
    // El cuerpo sigue legible para quien recibe la respuesta.
    expect(await response.text()).toContain("JWT issued at future");
  });

  it("no reintenta otros 401", async () => {
    const base = vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: "JWT expired" }), { status: 401 }));
    const response = await createRetryFetch(base, noWait)("https://x.test/rest/v1/appointments");
    expect(response.status).toBe(401);
    expect(base).toHaveBeenCalledTimes(1);
  });
});
