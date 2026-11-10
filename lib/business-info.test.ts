import { describe, expect, it } from "vitest";

import {
  buildBusinessJsonLd,
  formatDays,
  formatRanges,
  groupOpeningHours,
  type WeekDayHours,
} from "@/lib/business-info";

const open = (weekday: number, ...ranges: [string, string][]): WeekDayHours => ({
  weekday,
  is_closed: false,
  ranges: ranges.map(([opens_at, closes_at]) => ({ opens_at, closes_at })),
});
const closed = (weekday: number): WeekDayHours => ({ weekday, is_closed: true, ranges: [] });

describe("groupOpeningHours", () => {
  it("junta días seguidos con el mismo horario y recorta los segundos", () => {
    const days = [closed(0), closed(1), ...[2, 3, 4, 5, 6].map((d) => open(d, ["10:00:00", "20:00:00"]))];
    expect(groupOpeningHours(days)).toEqual([
      { weekdays: [2, 3, 4, 5, 6], ranges: [{ opens: "10:00", closes: "20:00" }] },
    ]);
  });

  it("separa días con horarios distintos y los cortes de mediodía", () => {
    const days = [
      open(1, ["10:00:00", "13:00:00"], ["16:00:00", "20:00:00"]),
      open(2, ["10:00:00", "13:00:00"], ["16:00:00", "20:00:00"]),
      open(6, ["09:00:00", "14:00:00"]),
    ];
    expect(groupOpeningHours(days)).toEqual([
      {
        weekdays: [1, 2],
        ranges: [
          { opens: "10:00", closes: "13:00" },
          { opens: "16:00", closes: "20:00" },
        ],
      },
      { weekdays: [6], ranges: [{ opens: "09:00", closes: "14:00" }] },
    ]);
  });

  it("un día cerrado en el medio corta el grupo aunque los de al lado coincidan", () => {
    const days = [open(2, ["10:00", "20:00"]), closed(3), open(4, ["10:00", "20:00"])];
    expect(groupOpeningHours(days).map((g) => g.weekdays)).toEqual([[2], [4]]);
  });

  it("ordena la semana de lunes a domingo", () => {
    const days = [open(0, ["10:00", "14:00"]), open(1, ["10:00", "20:00"])];
    expect(groupOpeningHours(days).map((g) => g.weekdays)).toEqual([[1], [0]]);
  });
});

describe("formatDays y formatRanges", () => {
  it("nombra uno, dos o un rango de días", () => {
    expect(formatDays([2])).toBe("Martes");
    expect(formatDays([2, 3])).toBe("Martes y miércoles");
    expect(formatDays([2, 3, 4, 5, 6])).toBe("Martes a sábado");
  });

  it("une los bloques con 'y'", () => {
    expect(
      formatRanges([
        { opens: "10:00", closes: "13:00" },
        { opens: "16:00", closes: "20:00" },
      ]),
    ).toBe("10:00 a 13:00 y 16:00 a 20:00");
  });
});

describe("buildBusinessJsonLd", () => {
  const base = {
    siteUrl: "https://houssestudio.com.ar",
    groups: [{ weekdays: [2, 3, 4, 5, 6], ranges: [{ opens: "10:00", closes: "20:00" }] }],
    services: [{ name: "Corte de pelo", price: 18000 }],
  };

  it("arma horarios, ofertas y teléfono internacional", () => {
    const jsonLd = buildBusinessJsonLd({ ...base, whatsappNumber: "5493425972035" });
    expect(jsonLd.telephone).toBe("+5493425972035");
    expect(jsonLd.openingHoursSpecification).toEqual([
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
        opens: "10:00",
        closes: "20:00",
      },
    ]);
    expect(jsonLd.makesOffer[0]).toMatchObject({ price: 18000, priceCurrency: "ARS" });
  });

  it("sin teléfono no inventa el campo", () => {
    expect("telephone" in buildBusinessJsonLd({ ...base, whatsappNumber: null })).toBe(false);
  });
});
