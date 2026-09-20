import { describe, expect, it } from "vitest";

import { buildAppointmentTimeline } from "@/lib/appointment-timeline";

const BASE = {
  created_at: "2026-09-17T20:14:00.000Z",
  confirmed_at: "2026-09-17T21:02:00.000Z",
  completed_at: null,
  cancelled_at: null,
  cancelled_by: null,
  payment: null,
};

describe("buildAppointmentTimeline", () => {
  it("un turno completado termina en 'Completado y cobrado', con la hora del pago", () => {
    const steps = buildAppointmentTimeline({
      ...BASE,
      status: "completado",
      completed_at: "2026-09-19T16:47:00.000Z",
      payment: { paid_at: "2026-09-19T16:47:30.000Z" },
    });

    expect(steps.map((s) => s.label)).toEqual(["Reservado", "Confirmado", "Completado y cobrado"]);
    expect(steps[2].at).toBe("2026-09-19T16:47:30.000Z");
    expect(steps[0].author).toBe("desde el portal");
    expect(steps[2].author).toBe("vos");
  });

  it("un turno cancelado por el cliente lo aclara en el autor", () => {
    const steps = buildAppointmentTimeline({
      ...BASE,
      status: "cancelado",
      cancelled_at: "2026-09-19T09:12:00.000Z",
      cancelled_by: "cliente",
    });

    expect(steps.map((s) => s.label)).toEqual(["Reservado", "Confirmado", "Cancelado por el cliente"]);
    expect(steps[2].author).toBe("desde el link del turno");
  });

  it("un turno cancelado por el barbero dice 'vos'", () => {
    const steps = buildAppointmentTimeline({
      ...BASE,
      status: "cancelado",
      cancelled_at: "2026-09-19T09:12:00.000Z",
      cancelled_by: "barbero",
    });

    expect(steps.at(-1)).toMatchObject({ label: "Cancelado", author: "vos" });
  });

  it("un rechazo desde pendiente no tiene paso de Confirmado", () => {
    const steps = buildAppointmentTimeline({
      ...BASE,
      confirmed_at: null,
      status: "cancelado",
      cancelled_at: "2026-09-18T10:00:00.000Z",
      cancelled_by: "barbero",
    });

    expect(steps.map((s) => s.label)).toEqual(["Reservado", "Cancelado"]);
  });

  it("un turno confirmado sin resolver termina en 'Confirmado'", () => {
    const steps = buildAppointmentTimeline({ ...BASE, status: "confirmado" });
    expect(steps.map((s) => s.label)).toEqual(["Reservado", "Confirmado"]);
  });

  it("un turno ausente no tiene paso propio (sin timestamp en el esquema todavía)", () => {
    const steps = buildAppointmentTimeline({ ...BASE, status: "no_show" });
    expect(steps.map((s) => s.label)).toEqual(["Reservado", "Confirmado"]);
  });
});
