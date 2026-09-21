import { describe, expect, it } from "vitest";

import {
  businessTimeToDate,
  computeFreeGaps,
  computeSlots,
  mergeIntervals,
  subtractIntervals,
  weekdayOf,
  type Interval,
} from "@/lib/availability";

const OPEN_9_TO_19 = { isClosed: false, opensAt: "09:00", closesAt: "19:00" };

/** Fecha de referencia: martes 18 de agosto de 2026. */
const TUESDAY = "2026-08-18";

/** Helper: intervalo a partir de horas locales del local. */
function at(dateKey: string, from: string, to: string): Interval {
  return {
    start: businessTimeToDate(dateKey, from),
    end: businessTimeToDate(dateKey, to),
  };
}

/** Los slots como `HH:MM` locales, que es como se leen en la interfaz. */
function times(slots: Interval[]): string[] {
  return slots.map((s) =>
    s.start.toLocaleTimeString("es-AR", {
      timeZone: "America/Argentina/Buenos_Aires",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }),
  );
}

/** Un instante bien anterior a la fecha de prueba, para no filtrar por pasado. */
const LONG_BEFORE = new Date("2026-01-01T00:00:00Z");

describe("businessTimeToDate", () => {
  it("interpreta la hora en la zona del local, no en UTC", () => {
    // Argentina es UTC-3 todo el ano: las 09:00 locales son las 12:00 UTC.
    expect(businessTimeToDate(TUESDAY, "09:00").toISOString()).toBe(
      "2026-08-18T12:00:00.000Z",
    );
  });
});

describe("weekdayOf", () => {
  it("devuelve el dia de la semana local", () => {
    expect(weekdayOf("2026-08-16")).toBe(0); // domingo
    expect(weekdayOf(TUESDAY)).toBe(2); // martes
    expect(weekdayOf("2026-08-22")).toBe(6); // sabado
  });

  it("no se corre de dia cerca de la medianoche local", () => {
    // A las 00:30 del domingo en Argentina ya son las 03:30 UTC del domingo,
    // pero a las 23:30 del sabado local todavia es sabado aunque en UTC sea
    // domingo. El calculo debe seguir la fecha local, no la UTC.
    expect(weekdayOf("2026-08-22")).toBe(6);
    expect(weekdayOf("2026-08-23")).toBe(0);
  });
});

describe("mergeIntervals", () => {
  it("une superpuestos y contiguos, y descarta los vacios", () => {
    const merged = mergeIntervals([
      at(TUESDAY, "12:00", "13:00"),
      at(TUESDAY, "09:00", "10:00"),
      at(TUESDAY, "09:30", "11:00"), // se superpone con el anterior
      at(TUESDAY, "11:00", "11:30"), // contiguo
      at(TUESDAY, "15:00", "15:00"), // vacio
    ]);

    expect(merged).toHaveLength(2);
    expect(times(merged)).toEqual(["09:00", "12:00"]);
    expect(merged[0].end).toEqual(businessTimeToDate(TUESDAY, "11:30"));
  });

  it("absorbe un intervalo contenido dentro de otro", () => {
    const merged = mergeIntervals([
      at(TUESDAY, "09:00", "18:00"),
      at(TUESDAY, "12:00", "13:00"),
    ]);
    expect(merged).toHaveLength(1);
    expect(merged[0].end).toEqual(businessTimeToDate(TUESDAY, "18:00"));
  });
});

describe("subtractIntervals", () => {
  it("parte el rango en los huecos libres", () => {
    const free = subtractIntervals(at(TUESDAY, "09:00", "19:00"), [
      at(TUESDAY, "13:00", "14:00"),
    ]);
    expect(times(free)).toEqual(["09:00", "14:00"]);
  });

  it("recorta los ocupados que exceden el rango base", () => {
    const free = subtractIntervals(at(TUESDAY, "09:00", "19:00"), [
      at(TUESDAY, "07:00", "10:00"),
      at(TUESDAY, "18:00", "23:00"),
    ]);
    expect(times(free)).toEqual(["10:00"]);
    expect(free[0].end).toEqual(businessTimeToDate(TUESDAY, "18:00"));
  });

  it("devuelve vacio si el rango esta completamente ocupado", () => {
    const free = subtractIntervals(at(TUESDAY, "09:00", "19:00"), [
      at(TUESDAY, "08:00", "20:00"),
    ]);
    expect(free).toEqual([]);
  });
});

describe("computeSlots", () => {
  it("devuelve vacio en un dia cerrado", () => {
    expect(
      computeSlots({
        dateKey: TUESDAY,
        durationMinutes: 45,
        hours: { isClosed: true, opensAt: "09:00", closesAt: "19:00" },
        now: LONG_BEFORE,
      }),
    ).toEqual([]);
  });

  it("devuelve vacio si no hay horario configurado", () => {
    expect(
      computeSlots({
        dateKey: TUESDAY,
        durationMinutes: 45,
        hours: null,
        now: LONG_BEFORE,
      }),
    ).toEqual([]);
  });

  it("encadena los slots segun la duracion del servicio", () => {
    const slots = computeSlots({
      dateKey: TUESDAY,
      durationMinutes: 45,
      hours: { isClosed: false, opensAt: "09:00", closesAt: "12:00" },
      now: LONG_BEFORE,
    });

    // 9:00, 9:45, 10:30, 11:15 (termina 12:00 justo en el cierre).
    expect(times(slots)).toEqual(["09:00", "09:45", "10:30", "11:15"]);
  });

  it("no ofrece un slot que se pasa del horario de cierre", () => {
    const slots = computeSlots({
      dateKey: TUESDAY,
      durationMinutes: 60,
      hours: { isClosed: false, opensAt: "09:00", closesAt: "11:30" },
      now: LONG_BEFORE,
    });

    // 11:00 terminaria 12:00, media hora despues del cierre.
    expect(times(slots)).toEqual(["09:00", "10:00"]);
  });

  it("reanuda el encadenado despues de un turno existente", () => {
    const slots = computeSlots({
      dateKey: TUESDAY,
      durationMinutes: 45,
      hours: { isClosed: false, opensAt: "09:00", closesAt: "14:00" },
      busy: [at(TUESDAY, "11:00", "11:45")],
      now: LONG_BEFORE,
    });

    // 10:30 quedaria pisando el turno de las 11:00, asi que se descarta; el
    // siguiente hueco arranca limpio a las 11:45.
    expect(times(slots)).toEqual(["09:00", "09:45", "11:45", "12:30", "13:15"]);
  });

  it("descarta un hueco mas corto que el servicio", () => {
    const slots = computeSlots({
      dateKey: TUESDAY,
      durationMinutes: 60,
      hours: { isClosed: false, opensAt: "09:00", closesAt: "12:00" },
      busy: [at(TUESDAY, "09:30", "11:30")],
      now: LONG_BEFORE,
    });

    // Quedan huecos de 30 min antes y de 30 min despues: no entra ninguno.
    expect(slots).toEqual([]);
  });

  it("ofrece horarios distintos segun el servicio elegido", () => {
    const base = {
      dateKey: TUESDAY,
      hours: { isClosed: false, opensAt: "09:00", closesAt: "12:00" },
      now: LONG_BEFORE,
    };

    expect(times(computeSlots({ ...base, durationMinutes: 45 }))).toEqual([
      "09:00",
      "09:45",
      "10:30",
      "11:15",
    ]);
    expect(times(computeSlots({ ...base, durationMinutes: 60 }))).toEqual([
      "09:00",
      "10:00",
      "11:00",
    ]);
  });

  it("excluye tanto bloqueos manuales como turnos", () => {
    const slots = computeSlots({
      dateKey: TUESDAY,
      durationMinutes: 60,
      hours: OPEN_9_TO_19,
      busy: [
        at(TUESDAY, "13:00", "14:00"), // almuerzo
        at(TUESDAY, "09:00", "10:00"), // turno confirmado
      ],
      now: LONG_BEFORE,
    });

    expect(times(slots)).toEqual([
      "10:00",
      "11:00",
      "12:00",
      "14:00",
      "15:00",
      "16:00",
      "17:00",
      "18:00",
    ]);
  });

  it("descarta los slots que ya pasaron y respeta la anticipacion minima", () => {
    const slots = computeSlots({
      dateKey: TUESDAY,
      durationMinutes: 60,
      hours: { isClosed: false, opensAt: "09:00", closesAt: "14:00" },
      // 10:20 hora local.
      now: businessTimeToDate(TUESDAY, "10:20"),
      minLeadMinutes: 60,
    });

    // Con una hora de anticipacion, el primer horario reservable es a las 12:00.
    expect(times(slots)).toEqual(["12:00", "13:00"]);
  });

  it("mantiene la grilla estable ante duraciones que no son multiplos de la hora", () => {
    const slots = computeSlots({
      dateKey: TUESDAY,
      durationMinutes: 50,
      hours: { isClosed: false, opensAt: "09:00", closesAt: "13:00" },
      now: LONG_BEFORE,
    });

    // 12:20 terminaria 13:10, pasado el cierre, asi que no se ofrece.
    expect(times(slots)).toEqual(["09:00", "09:50", "10:40", "11:30"]);
  });
});

describe("computeSlots: horario partido", () => {
  it("encadena cada tramo por separado, sin saltar el hueco del medio", () => {
    const slots = computeSlots({
      dateKey: TUESDAY,
      durationMinutes: 60,
      hours: {
        isClosed: false,
        opensAt: "07:00",
        closesAt: "12:00",
        secondRange: { opensAt: "15:00", closesAt: "20:00" },
      },
      now: LONG_BEFORE,
    });

    // Cada tramo arranca su propio encadenado en su propio borde: no hay un
    // slot 11:00-12:00 seguido de "13:00" ni nada que dependa del tramo
    // anterior. El de las 12:00 no entra (tramo cierra justo ahi).
    expect(times(slots)).toEqual([
      "07:00", "08:00", "09:00", "10:00", "11:00",
      "15:00", "16:00", "17:00", "18:00", "19:00",
    ]);
  });

  it("un turno que pisa el segundo tramo solo afecta a ese tramo", () => {
    const slots = computeSlots({
      dateKey: TUESDAY,
      durationMinutes: 60,
      hours: {
        isClosed: false,
        opensAt: "07:00",
        closesAt: "12:00",
        secondRange: { opensAt: "15:00", closesAt: "20:00" },
      },
      busy: [at(TUESDAY, "16:00", "17:00")],
      now: LONG_BEFORE,
    });

    expect(times(slots)).toEqual([
      "07:00", "08:00", "09:00", "10:00", "11:00",
      "15:00", "17:00", "18:00", "19:00",
    ]);
  });

  it("sin segundo tramo se comporta exactamente como horario corrido", () => {
    const slots = computeSlots({
      dateKey: TUESDAY,
      durationMinutes: 60,
      hours: { isClosed: false, opensAt: "09:00", closesAt: "12:00", secondRange: null },
      now: LONG_BEFORE,
    });

    expect(times(slots)).toEqual(["09:00", "10:00", "11:00"]);
  });
});

describe("computeFreeGaps", () => {
  it("sin horario o local cerrado no hay huecos", () => {
    expect(computeFreeGaps({ dateKey: TUESDAY, hours: null })).toEqual([]);
    expect(
      computeFreeGaps({ dateKey: TUESDAY, hours: { ...OPEN_9_TO_19, isClosed: true } }),
    ).toEqual([]);
  });

  it("sin ocupados, el hueco es el dia entero", () => {
    const gaps = computeFreeGaps({ dateKey: TUESDAY, hours: OPEN_9_TO_19 });
    expect(gaps).toEqual([at(TUESDAY, "09:00", "19:00")]);
  });

  it("resta los turnos y bloqueos ocupados, sin trocear por duracion", () => {
    const gaps = computeFreeGaps({
      dateKey: TUESDAY,
      hours: OPEN_9_TO_19,
      busy: [at(TUESDAY, "10:30", "11:15"), at(TUESDAY, "12:00", "13:00")],
    });

    expect(gaps).toEqual([
      at(TUESDAY, "09:00", "10:30"),
      at(TUESDAY, "11:15", "12:00"),
      at(TUESDAY, "13:00", "19:00"),
    ]);
  });

  it("no filtra por `now`: los huecos de esta manana siguen apareciendo", () => {
    const gaps = computeFreeGaps({
      dateKey: TUESDAY,
      hours: OPEN_9_TO_19,
      busy: [at(TUESDAY, "12:00", "13:00")],
    });

    // A diferencia de computeSlots, no hay `now`/`minLeadMinutes` que filtre:
    // el primer hueco (09:00-12:00) esta completo aunque ya haya pasado.
    expect(gaps[0]).toEqual(at(TUESDAY, "09:00", "12:00"));
  });

  it("un horario ocupado por completo no deja huecos", () => {
    const gaps = computeFreeGaps({
      dateKey: TUESDAY,
      hours: OPEN_9_TO_19,
      busy: [at(TUESDAY, "09:00", "19:00")],
    });

    expect(gaps).toEqual([]);
  });

  it("horario partido: cada tramo resta sus propios ocupados por separado", () => {
    const gaps = computeFreeGaps({
      dateKey: TUESDAY,
      hours: {
        isClosed: false,
        opensAt: "07:00",
        closesAt: "12:00",
        secondRange: { opensAt: "15:00", closesAt: "20:00" },
      },
      busy: [at(TUESDAY, "16:00", "17:00")],
    });

    // El corte del mediodia (12:00-15:00) nunca aparece como hueco: no es
    // parte de ningun tramo del horario comercial.
    expect(gaps).toEqual([
      at(TUESDAY, "07:00", "12:00"),
      at(TUESDAY, "15:00", "16:00"),
      at(TUESDAY, "17:00", "20:00"),
    ]);
  });
});

describe("computeSlots: limite de anticipacion", () => {
  const base = {
    durationMinutes: 60,
    hours: { isClosed: false, opensAt: "09:00", closesAt: "12:00" },
    now: LONG_BEFORE,
  };

  it("no ofrece nada despues del ultimo dia reservable", () => {
    expect(
      computeSlots({ ...base, dateKey: TUESDAY, maxDateKey: "2026-08-17" }),
    ).toEqual([]);
  });

  it("el dia del tope entra: el limite es inclusive", () => {
    // Con el tope puesto en el dia consultado, ese dia sigue siendo reservable.
    expect(
      times(computeSlots({ ...base, dateKey: TUESDAY, maxDateKey: TUESDAY })),
    ).toEqual(["09:00", "10:00", "11:00"]);
  });

  it("sin limite configurado se comporta como antes", () => {
    expect(times(computeSlots({ ...base, dateKey: TUESDAY }))).toEqual([
      "09:00",
      "10:00",
      "11:00",
    ]);
  });

  it("compara por dia de calendario y no por hora", () => {
    // Aunque falten pocas horas para el corte, el dia entero sigue disponible.
    const slots = computeSlots({
      ...base,
      dateKey: TUESDAY,
      maxDateKey: TUESDAY,
      now: businessTimeToDate(TUESDAY, "09:30"),
    });
    expect(times(slots)).toEqual(["10:00", "11:00"]);
  });
});
