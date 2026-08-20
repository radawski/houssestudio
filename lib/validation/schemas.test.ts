import { describe, expect, it } from "vitest";

import { bookingSchema, identifySchema, normalizeDni, normalizePhone } from "@/lib/validation/schemas";

describe("normalizeDni", () => {
  it("deja solo digitos", () => {
    expect(normalizeDni("30.123.456")).toBe("30123456");
    expect(normalizeDni("30 123 456")).toBe("30123456");
    expect(normalizeDni("30123456")).toBe("30123456");
  });

  it("distintos formatos del mismo DNI normalizan igual", () => {
    const variants = ["30.123.456", "30 123 456", "30-123-456", "30123456"];
    const normalized = new Set(variants.map(normalizeDni));
    expect(normalized.size).toBe(1);
    expect([...normalized][0]).toBe("30123456");
  });

  it("ignora letras sueltas", () => {
    expect(normalizeDni("DNI 30123456")).toBe("30123456");
  });
});

describe("identifySchema", () => {
  it("acepta un DNI de 7 u 8 digitos", () => {
    expect(identifySchema.safeParse({ dni: "3012345" }).success).toBe(true);
    expect(identifySchema.safeParse({ dni: "30123456" }).success).toBe(true);
  });

  it("normaliza el DNI antes de validar la longitud", () => {
    const result = identifySchema.safeParse({ dni: "30.123.456" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.dni).toBe("30123456");
  });

  it("rechaza DNIs demasiado cortos o demasiado largos", () => {
    expect(identifySchema.safeParse({ dni: "123456" }).success).toBe(false);
    expect(identifySchema.safeParse({ dni: "123456789" }).success).toBe(false);
  });

  it("rechaza vacio", () => {
    expect(identifySchema.safeParse({ dni: "" }).success).toBe(false);
  });
});

describe("bookingSchema", () => {
  const base = {
    serviceId: "550e8400-e29b-41d4-a716-446655440000",
    startsAt: "2026-08-18T12:00:00.000Z",
    dni: "30123456",
  };

  it("acepta el minimo sin datos de contacto (cliente reconocido)", () => {
    const result = bookingSchema.safeParse(base);
    expect(result.success).toBe(true);
  });

  it("acepta los datos de contacto completos (cliente nuevo)", () => {
    const result = bookingSchema.safeParse({
      ...base,
      fullName: "Juan Perez",
      phone: "11 2345-6789",
      email: "juan@example.com",
    });
    expect(result.success).toBe(true);
  });

  it("rechaza un DNI invalido aunque el resto este bien", () => {
    const result = bookingSchema.safeParse({ ...base, dni: "abc" });
    expect(result.success).toBe(false);
  });

  it("rechaza un email mal formado cuando se lo manda", () => {
    const result = bookingSchema.safeParse({ ...base, email: "no-es-un-email" });
    expect(result.success).toBe(false);
  });

  it("rechaza un telefono invalido cuando se lo manda", () => {
    const result = bookingSchema.safeParse({ ...base, phone: "123" });
    expect(result.success).toBe(false);
  });
});

describe("normalizePhone (regresion)", () => {
  it("sigue funcionando igual que antes del cambio de DNI", () => {
    expect(normalizePhone("11 2345-6789")).toBe("1123456789");
    expect(normalizePhone("+54 9 11 2345 6789")).toBe("1123456789");
  });
});
