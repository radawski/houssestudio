import { describe, expect, it } from "vitest";

import {
  LOCAL_AREA_CODES,
  checkPhone,
  isLocalPhone,
  normalizePhone,
  toWhatsappNumber,
} from "@/lib/phone";

describe("LOCAL_AREA_CODES", () => {
  it("no tiene duplicados", () => {
    expect(new Set(LOCAL_AREA_CODES).size).toBe(LOCAL_AREA_CODES.length);
  });

  it("no tiene una característica que sea prefijo de otra", () => {
    // Un solapamiento haría que el resultado dependa del orden de comparación.
    const overlaps = LOCAL_AREA_CODES.flatMap((a) =>
      LOCAL_AREA_CODES.filter((b) => b !== a && b.startsWith(a)).map((b) => `${a} ⊂ ${b}`),
    );
    expect(overlaps).toEqual([]);
  });
});

describe("checkPhone: un mismo número escrito de todas las formas", () => {
  // Todas estas son la misma línea de Santa Fe y tienen que resolver igual.
  const variantes = [
    "3425331802",
    "342 533 1802",
    "342 5331802",
    "(0342) 533-1802",
    "03425331802",
    "+54 342 533 1802",
    "+54 9 342 533-1802",
    "54 9 342 5331802",
    "0054 9 342 5331802",
    // El formato que rompía la versión anterior: el 15 va después de la
    // característica, no al principio.
    "0342 15 533 1802",
    "0342 15-5331802",
    "+54 9 342 15 533 1802",
  ];

  it.each(variantes)("%s resuelve a 3425331802", (entrada) => {
    expect(checkPhone(entrada)).toEqual({
      kind: "local",
      areaCode: "342",
      national: "3425331802",
    });
  });
});

describe("checkPhone: característica de cuatro dígitos", () => {
  it("reconoce Rafaela sin confundirla con una de tres", () => {
    expect(checkPhone("3492123456")).toEqual({
      kind: "local",
      areaCode: "3492",
      national: "3492123456",
    });
  });

  it("le saca el 15 sabiendo dónde termina la característica", () => {
    expect(checkPhone("03492 15 123456")).toEqual({
      kind: "local",
      areaCode: "3492",
      national: "3492123456",
    });
  });

  it("reconoce Esperanza y Paraná", () => {
    expect(checkPhone("3496123456").kind).toBe("local");
    expect(checkPhone("3434123456")).toEqual({
      kind: "local",
      areaCode: "343",
      national: "3434123456",
    });
  });
});

describe("checkPhone: fuera del área", () => {
  it("toma un número porteño como de otra zona, no como inválido", () => {
    expect(checkPhone("1123456789")).toEqual({
      kind: "out_of_area",
      national: "1123456789",
    });
  });

  it("interpreta el 15 de una característica desconocida", () => {
    // 011 15 2345-6789 → característica 11 + abonado 23456789.
    expect(checkPhone("011 15 2345 6789")).toEqual({
      kind: "out_of_area",
      national: "1123456789",
    });
  });

  it("no acepta como local una característica que no está en la lista", () => {
    // 3482 es Reconquista: misma provincia, fuera del radio de atención.
    expect(checkPhone("3482123456").kind).toBe("out_of_area");
    // 3402 no figura en la lista aunque se parezca a las vecinas.
    expect(checkPhone("3402123456").kind).toBe("out_of_area");
  });
});

describe("checkPhone: entradas que no son un teléfono", () => {
  it.each([
    ["", "vacío"],
    ["123", "muy corto"],
    ["34253318", "ocho dígitos"],
    ["342533180200", "demasiado largo"],
    ["no es un numero", "sin dígitos"],
  ])("%s (%s) es inválido", (entrada) => {
    expect(checkPhone(entrada)).toEqual({ kind: "invalid" });
  });
});

describe("normalizePhone", () => {
  it("deja el mismo valor para cualquier forma de escribir el número", () => {
    const formas = ["0342 15 533 1802", "+54 9 342 533-1802", "3425331802"];
    expect(new Set(formas.map(normalizePhone)).size).toBe(1);
  });

  it("conserva los dígitos de algo que no puede interpretar", () => {
    // La validación decide si se rechaza; acá no se pierde lo que escribió.
    expect(normalizePhone("123")).toBe("123");
  });
});

describe("isLocalPhone", () => {
  it("separa el área de atención del resto", () => {
    expect(isLocalPhone("0342 15 533 1802")).toBe(true);
    expect(isLocalPhone("1123456789")).toBe(false);
    expect(isLocalPhone("123")).toBe(false);
  });
});

describe("toWhatsappNumber", () => {
  it("arma el formato que espera wa.me", () => {
    expect(toWhatsappNumber("0342 15 533 1802")).toBe("5493425331802");
  });

  it("devuelve null si no hay número que armar", () => {
    expect(toWhatsappNumber("123")).toBeNull();
  });
});
