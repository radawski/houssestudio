import { describe, expect, it } from "vitest";

import { isFirstVisit, noShowCountLabel, summarizeCustomerHistory } from "@/lib/no-shows";

const A = "cliente-a";
const B = "cliente-b";

describe("summarizeCustomerHistory", () => {
  it("cuenta faltas y visitas por cliente, y guarda la última falta", () => {
    const history = summarizeCustomerHistory([
      { customer_id: A, status: "no_show", starts_at: "2026-09-12T14:15:00.000Z" },
      { customer_id: A, status: "completado", starts_at: "2026-10-02T20:00:00.000Z" },
      { customer_id: A, status: "no_show", starts_at: "2026-10-14T13:30:00.000Z" },
      { customer_id: B, status: "completado", starts_at: "2026-10-01T13:00:00.000Z" },
    ]);

    expect(history.get(A)).toEqual({ noShows: 2, lastNoShowAt: "2026-10-14T13:30:00.000Z", visits: 1 });
    expect(history.get(B)).toEqual({ noShows: 0, lastNoShowAt: null, visits: 1 });
  });

  it("no le importa el orden de las filas", () => {
    const history = summarizeCustomerHistory([
      { customer_id: A, status: "no_show", starts_at: "2026-10-14T13:30:00.000Z" },
      { customer_id: A, status: "no_show", starts_at: "2026-09-12T14:15:00.000Z" },
    ]);
    expect(history.get(A)?.lastNoShowAt).toBe("2026-10-14T13:30:00.000Z");
  });
});

describe("noShowCountLabel", () => {
  it("habla en singular y en plural", () => {
    expect(noShowCountLabel({ noShows: 1, lastNoShowAt: "x", visits: 0 })).toBe("Faltó 1 vez");
    expect(noShowCountLabel({ noShows: 3, lastNoShowAt: "x", visits: 0 })).toBe("Faltó 3 veces");
  });

  it("no dice nada si nunca faltó", () => {
    expect(noShowCountLabel({ noShows: 0, lastNoShowAt: null, visits: 4 })).toBeNull();
    expect(noShowCountLabel(undefined)).toBeNull();
  });
});

describe("isFirstVisit", () => {
  it("es la primera vez si nunca vino ni faltó", () => {
    expect(isFirstVisit(undefined)).toBe(true);
    expect(isFirstVisit({ noShows: 0, lastNoShowAt: null, visits: 0 })).toBe(true);
  });

  it("no lo es si ya vino o si ya faltó", () => {
    expect(isFirstVisit({ noShows: 0, lastNoShowAt: null, visits: 1 })).toBe(false);
    expect(isFirstVisit({ noShows: 1, lastNoShowAt: "x", visits: 0 })).toBe(false);
  });
});
