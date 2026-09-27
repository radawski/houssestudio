import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { deriveManageToken, hashManageToken, manageTokenMatches } = await import("@/lib/tokens");

const ID = "7f0c1e2a-3b4d-4e5f-8a9b-0c1d2e3f4a5b";

describe("deriveManageToken", () => {
  it("es determinístico para el mismo turno y secreto", () => {
    expect(deriveManageToken(ID, "secreto-a")).toBe(deriveManageToken(ID, "secreto-a"));
  });

  it("cambia con el turno y con el secreto", () => {
    const base = deriveManageToken(ID, "secreto-a");
    expect(deriveManageToken("otro-id", "secreto-a")).not.toBe(base);
    expect(deriveManageToken(ID, "secreto-b")).not.toBe(base);
  });

  it("tiene la forma de siempre: 32 bytes en base64url", () => {
    const token = deriveManageToken(ID, "secreto-a");
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(Buffer.from(token, "base64url")).toHaveLength(32);
  });

  it("sin MANAGE_TOKEN_SECRET falla con un mensaje claro", () => {
    const previous = process.env.MANAGE_TOKEN_SECRET;
    delete process.env.MANAGE_TOKEN_SECRET;
    expect(() => deriveManageToken(ID)).toThrow(/MANAGE_TOKEN_SECRET/);
    process.env.MANAGE_TOKEN_SECRET = previous;
  });
});

describe("manageTokenMatches", () => {
  it("reconoce un turno con token derivado y descarta uno viejo (token al azar)", () => {
    process.env.MANAGE_TOKEN_SECRET = "secreto-test";
    const derivedHash = hashManageToken(deriveManageToken(ID));
    expect(manageTokenMatches(ID, derivedHash)).toBe(true);
    expect(manageTokenMatches(ID, hashManageToken("token-viejo-al-azar"))).toBe(false);
  });
});
