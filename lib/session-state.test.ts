import { AuthApiError, AuthRetryableFetchError, AuthSessionMissingError } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { classifySession } from "@/lib/session-state";

describe("classifySession", () => {
  it("con usuario muestra su email", () => {
    expect(classifySession({ user: { email: "peluquero@example.com" }, error: null })).toEqual({
      kind: "ok",
      email: "peluquero@example.com",
    });
  });

  it("sin sesión (venció o se cerró) va al login, no a la tarjeta de error", () => {
    expect(classifySession({ user: null, error: new AuthSessionMissingError() })).toEqual({ kind: "expired" });
  });

  it("un token que Supabase rechaza también es sesión vencida", () => {
    expect(classifySession({ user: null, error: new AuthApiError("JWT expired", 401, "bad_jwt") })).toEqual({
      kind: "expired",
    });
  });

  it("sin usuario ni error también va al login", () => {
    expect(classifySession({ user: null, error: null })).toEqual({ kind: "expired" });
  });

  it("si no se pudo llegar a Supabase es un error de red, con reintento", () => {
    expect(classifySession({ user: null, error: new AuthRetryableFetchError("fetch failed", 0) })).toEqual({
      kind: "error",
      reason: "Error de red",
    });
  });

  it("si Supabase responde con un 5xx es un error del servidor", () => {
    expect(
      classifySession({ user: null, error: new AuthApiError("upstream", 503, "unexpected_failure") }),
    ).toEqual({ kind: "error", reason: "Error del servidor" });
  });

  it("cualquier otra falla queda como error inesperado, nunca como sesión vencida", () => {
    expect(classifySession({ user: null, error: new Error("boom") })).toEqual({
      kind: "error",
      reason: "Error inesperado",
    });
  });
});
