import { describe, expect, it } from "vitest";

import { compareCustomers, initials, matchesCustomerQuery, summarizeCustomer } from "@/lib/customer-summary";

const NOW = new Date("2026-11-10T15:00:00.000Z");

describe("summarizeCustomer", () => {
  it("cuenta visitas, faltas, cancelaciones, lo gastado y la última visita", () => {
    const summary = summarizeCustomer(
      [
        { status: "completado", starts_at: "2026-10-02T20:00:00.000Z", paid: 18000 },
        { status: "completado", starts_at: "2026-11-03T21:30:00.000Z", paid: 12000 },
        { status: "no_show", starts_at: "2026-10-14T13:30:00.000Z" },
        { status: "cancelado", starts_at: "2026-09-20T13:30:00.000Z" },
        { status: "confirmado", starts_at: "2026-11-20T20:00:00.000Z" },
        { status: "pendiente", starts_at: "2026-11-13T21:30:00.000Z" },
      ],
      NOW,
    );

    expect(summary).toEqual({
      visits: 2,
      noShows: 1,
      cancellations: 1,
      spent: 30000,
      lastVisitAt: "2026-11-03T21:30:00.000Z",
      nextAt: "2026-11-13T21:30:00.000Z",
    });
  });

  it("un cliente sin turnos queda en cero", () => {
    expect(summarizeCustomer([], NOW)).toEqual({
      visits: 0,
      noShows: 0,
      cancellations: 0,
      spent: 0,
      lastVisitAt: null,
      nextAt: null,
    });
  });

  it("un confirmado que ya pasó sin cobrar no cuenta como próximo", () => {
    expect(summarizeCustomer([{ status: "confirmado", starts_at: "2026-11-01T13:00:00.000Z" }], NOW).nextAt).toBeNull();
  });
});

describe("compareCustomers", () => {
  const make = (full_name: string, lastVisitAt: string | null) => ({ full_name, summary: { lastVisitAt } });

  it("ordena por última visita y deja al final a quien nunca vino, por nombre", () => {
    const list = [
      make("Zoe Nunca", null),
      make("Ana Vieja", "2026-09-01T13:00:00.000Z"),
      make("Bruno Nunca", null),
      make("Carla Reciente", "2026-11-03T13:00:00.000Z"),
    ].sort(compareCustomers);

    expect(list.map((c) => c.full_name)).toEqual(["Carla Reciente", "Ana Vieja", "Bruno Nunca", "Zoe Nunca"]);
  });
});

describe("matchesCustomerQuery", () => {
  const matias = { full_name: "Matías Correa", dni: "38204511", phone: "3425123344" };

  it("busca por nombre sin tildes ni mayúsculas, en cualquier orden", () => {
    expect(matchesCustomerQuery(matias, "mati")).toBe(true);
    expect(matchesCustomerQuery(matias, "MATÍAS")).toBe(true);
    expect(matchesCustomerQuery(matias, "correa mat")).toBe(true);
    expect(matchesCustomerQuery(matias, "lucas")).toBe(false);
  });

  it("busca por DNI o teléfono, con o sin separadores", () => {
    expect(matchesCustomerQuery(matias, "38.204")).toBe(true);
    expect(matchesCustomerQuery(matias, "342 512")).toBe(true);
    expect(matchesCustomerQuery(matias, "999")).toBe(false);
  });

  it("sin texto muestra a todos", () => {
    expect(matchesCustomerQuery(matias, "  ")).toBe(true);
  });
});

describe("initials", () => {
  it("toma la primera letra del nombre y del apellido", () => {
    expect(initials("Matías Correa")).toBe("MC");
    expect(initials("Juan Pablo Sosa")).toBe("JS");
    expect(initials("Ana")).toBe("A");
  });
});
