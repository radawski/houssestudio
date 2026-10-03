import { describe, expect, it } from "vitest";

import { daysBetweenKeys, pickComebacks, type ComebackCustomer, type CompletedVisit } from "@/lib/comebacks";

const TODAY = "2026-10-03";

/** Visita completada `daysAgo` días antes de hoy, a las 14:30 de Buenos Aires. */
function visit(id: string, customerId: string, daysAgo: number): CompletedVisit {
  const [year, month, day] = TODAY.split("-").map(Number);
  const startsAt = new Date(Date.UTC(year, month - 1, day - daysAgo, 17, 30)).toISOString();
  return { id, customerId, startsAt, serviceName: "Corte de pelo" };
}

const MARTIN: ComebackCustomer = { id: "c1", fullName: "Martín Gómez", email: "martin@example.com", optedOut: false };

function pick(
  visits: CompletedVisit[],
  overrides: Partial<{
    customers: ComebackCustomer[];
    upcoming: string[];
    alreadySent: string[];
  }> = {},
) {
  return pickComebacks({
    visits,
    customers: new Map((overrides.customers ?? [MARTIN]).map((customer) => [customer.id, customer])),
    upcoming: new Set(overrides.upcoming ?? []),
    alreadySent: new Set(overrides.alreadySent ?? []),
    today: TODAY,
  });
}

describe("daysBetweenKeys", () => {
  it("cuenta días de calendario", () => {
    expect(daysBetweenKeys("2026-09-03", "2026-10-03")).toBe(30);
  });

  it("cruza de año", () => {
    expect(daysBetweenKeys("2026-12-31", "2027-01-01")).toBe(1);
  });
});

describe("pickComebacks", () => {
  it("a los 30 días de la última visita le toca, con los datos del mail", () => {
    const { send } = pick([visit("a1", "c1", 30)]);
    expect(send).toEqual([
      {
        customerId: "c1",
        appointmentId: "a1",
        fullName: "Martín Gómez",
        email: "martin@example.com",
        lastVisitAt: visit("a1", "c1", 30).startsAt,
        serviceName: "Corte de pelo",
        daysSince: 30,
      },
    ]);
  });

  it("a los 29 días todavía no", () => {
    expect(pick([visit("a1", "c1", 29)]).send).toEqual([]);
  });

  it("a los 60 días todavía sí; a los 61 ya no (tope de antigüedad)", () => {
    expect(pick([visit("a1", "c1", 60)]).send).toHaveLength(1);
    expect(pick([visit("a1", "c1", 61)]).send).toEqual([]);
  });

  it("cuenta desde la ÚLTIMA visita: si volvió hace poco, no le toca", () => {
    expect(pick([visit("a1", "c1", 40), visit("a2", "c1", 10)]).send).toEqual([]);
  });

  it("no le escribe a quien ya tiene un turno pedido o confirmado por delante", () => {
    const result = pick([visit("a1", "c1", 35)], { upcoming: ["c1"] });
    expect(result.send).toEqual([]);
    expect(result.skipped).toBe(1);
  });

  it("un solo mail por visita: si ya salió para ese turno, no se repite", () => {
    expect(pick([visit("a1", "c1", 35)], { alreadySent: ["a1"] }).send).toEqual([]);
  });

  it("si volvió y se completó otra visita, es un ciclo nuevo", () => {
    const { send } = pick([visit("a1", "c1", 59), visit("a2", "c1", 31)], { alreadySent: ["a1"] });
    expect(send.map((comeback) => comeback.appointmentId)).toEqual(["a2"]);
  });

  it("no le escribe a quien se dio de baja", () => {
    expect(pick([visit("a1", "c1", 35)], { customers: [{ ...MARTIN, optedOut: true }] }).send).toEqual([]);
  });

  it("no le escribe a quien no tiene email", () => {
    expect(pick([visit("a1", "c1", 35)], { customers: [{ ...MARTIN, email: null }] }).send).toEqual([]);
    expect(pick([visit("a1", "c1", 35)], { customers: [{ ...MARTIN, email: "  " }] }).send).toEqual([]);
  });

  it("cuenta como salteados a los que estaban en fecha y no recibieron", () => {
    const result = pick([visit("a1", "c1", 35), visit("a2", "c2", 40), visit("a3", "c3", 10)], {
      customers: [
        MARTIN,
        { id: "c2", fullName: "Ana", email: null, optedOut: false },
        { id: "c3", fullName: "Luis", email: "luis@example.com", optedOut: false },
      ],
    });
    expect(result.send.map((comeback) => comeback.customerId)).toEqual(["c1"]);
    expect(result.skipped).toBe(1);
  });
});
