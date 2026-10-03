import { describe, expect, it } from "vitest";

import {
  bookingSchema,
  businessHourSchema,
  customerSchema,
  identifySchema,
  normalizeDni,
  normalizePhone,
  productCategorySchema,
  productSchema,
  walkInSaleSchema,
} from "@/lib/validation/schemas";

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

describe("customerSchema (alta desde el panel)", () => {
  const base = { dni: "30.123.456", fullName: "Martín Pérez", phone: "011 15 2345-6789" };

  it("acepta un número de otra zona: el alta del panel no tiene restricción de zona", () => {
    const result = customerSchema.safeParse(base);
    expect(result.success && result.data.phone).toBe("1123456789");
  });

  it("normaliza el DNI como en la reserva, para dar con la misma ficha", () => {
    const result = customerSchema.safeParse(base);
    expect(result.success && result.data.dni).toBe("30123456");
  });

  it("el email es opcional", () => {
    const result = customerSchema.safeParse({ ...base, email: undefined });
    expect(result.success && result.data.email).toBeUndefined();
  });

  it("acepta un email válido", () => {
    const result = customerSchema.safeParse({ ...base, email: "martin@example.com" });
    expect(result.success && result.data.email).toBe("martin@example.com");
  });

  it.each([
    ["dni", "123"],
    ["fullName", "M"],
    ["phone", "123"],
    ["email", "no-es-un-email"],
  ])("rechaza un %s inválido", (field, value) => {
    const result = customerSchema.safeParse({ ...base, [field]: value });
    expect(result.success).toBe(false);
  });
});

describe("normalizePhone (regresion)", () => {
  it("sigue funcionando igual que antes del cambio de DNI", () => {
    expect(normalizePhone("11 2345-6789")).toBe("1123456789");
    expect(normalizePhone("+54 9 11 2345 6789")).toBe("1123456789");
  });
});

describe("walkInSaleSchema", () => {
  const CORTE = "7f0c1e2a-3b4d-4e5f-8a9b-0c1d2e3f4a5b";
  const COCA = "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d";
  const base = { method: "efectivo", note: "  " };

  it("acepta servicios y productos con su cantidad, sin precios", () => {
    const result = walkInSaleSchema.safeParse({
      ...base,
      items: [
        { kind: "servicio", id: CORTE, quantity: 1 },
        { kind: "producto", id: COCA, quantity: "2" },
      ],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.items[1].quantity).toBe(2);
      expect(result.data.note).toBe("");
      expect(JSON.stringify(result.data)).not.toContain("price");
    }
  });

  it("rechaza una venta vacía, cantidades inválidas y un ítem repetido", () => {
    expect(walkInSaleSchema.safeParse({ ...base, items: [] }).success).toBe(false);
    expect(
      walkInSaleSchema.safeParse({ ...base, items: [{ kind: "producto", id: COCA, quantity: 0 }] }).success,
    ).toBe(false);
    expect(
      walkInSaleSchema.safeParse({ ...base, items: [{ kind: "producto", id: COCA, quantity: 1.5 }] }).success,
    ).toBe(false);
    expect(
      walkInSaleSchema.safeParse({
        ...base,
        items: [
          { kind: "producto", id: COCA, quantity: 1 },
          { kind: "producto", id: COCA, quantity: 2 },
        ],
      }).success,
    ).toBe(false);
  });

  it("rechaza un tipo de ítem desconocido o un id que no es uuid", () => {
    expect(
      walkInSaleSchema.safeParse({ ...base, items: [{ kind: "otro", id: COCA, quantity: 1 }] }).success,
    ).toBe(false);
    expect(
      walkInSaleSchema.safeParse({ ...base, items: [{ kind: "producto", id: "coca", quantity: 1 }] }).success,
    ).toBe(false);
  });
});

describe("businessHourSchema", () => {
  const day = (ranges: { opensAt: string; closesAt: string }[], isClosed = false) =>
    businessHourSchema.safeParse({ weekday: 1, isClosed, ranges });

  it("acepta 3 bloques que no se pisan, aunque lleguen desordenados", () => {
    const result = day([
      { opensAt: "17:00", closesAt: "20:00" },
      { opensAt: "09:00", closesAt: "12:00" },
      { opensAt: "13:00", closesAt: "15:00" },
    ]);
    expect(result.success).toBe(true);
  });

  it("acepta un bloque que arranca justo cuando cierra otro", () => {
    expect(day([{ opensAt: "09:00", closesAt: "12:00" }, { opensAt: "12:00", closesAt: "14:00" }]).success).toBe(true);
  });

  it("rechaza un dia abierto sin bloques, pero no uno cerrado", () => {
    const open = day([]);
    expect(open.success).toBe(false);
    expect(open.error?.issues[0]?.path).toEqual(["ranges"]);
    expect(day([], true).success).toBe(true);
  });

  it("rechaza un bloque que cierra antes de abrir y lo señala por su indice", () => {
    const result = day([{ opensAt: "09:00", closesAt: "12:00" }, { opensAt: "15:00", closesAt: "14:00" }]);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["ranges", 1]);
  });

  it("rechaza bloques que se pisan, sin importar el orden de carga", () => {
    const result = day([{ opensAt: "11:00", closesAt: "14:00" }, { opensAt: "09:00", closesAt: "12:00" }]);
    expect(result.success).toBe(false);
    // Ordenados, el que empieza despues (11:00) es el que pisa: indice 0.
    expect(result.error?.issues[0]?.path).toEqual(["ranges", 0]);
  });

  it("rechaza una hora incompleta", () => {
    expect(day([{ opensAt: "", closesAt: "12:00" }]).success).toBe(false);
  });
});

describe("productCategorySchema / productSchema", () => {
  it("categoría: recorta espacios y exige un nombre", () => {
    expect(productCategorySchema.parse({ name: "  Ceras  " }).name).toBe("Ceras");
    expect(productCategorySchema.safeParse({ name: "   " }).success).toBe(false);
  });

  it("producto: categoría, nombre y precio no negativo", () => {
    const ok = productSchema.safeParse({
      categoryId: "7f0c1e2a-3b4d-4e5f-8a9b-0c1d2e3f4a5b",
      name: " Coca-Cola ",
      price: "2300",
    });
    expect(ok.success && ok.data).toEqual({
      categoryId: "7f0c1e2a-3b4d-4e5f-8a9b-0c1d2e3f4a5b",
      name: "Coca-Cola",
      price: 2300,
    });
    expect(productSchema.safeParse({ categoryId: "x", name: "Agua", price: 100 }).success).toBe(false);
    expect(productSchema.safeParse({ categoryId: "7f0c1e2a-3b4d-4e5f-8a9b-0c1d2e3f4a5b", name: "Agua", price: -1 }).success).toBe(false);
  });
});
