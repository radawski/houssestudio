import { describe, expect, it } from "vitest";

import { formatCurrency, formatDateTime } from "@/lib/format";
import {
  buildBookingConfirmationEmail,
  buildCancellationAdminEmail,
  buildCancellationClientEmail,
  buildNewRequestAlertEmail,
} from "@/lib/email/templates";

const STARTS_AT = "2026-08-15T17:30:00.000Z"; // sábado 15 de agosto, 14:30 en Buenos Aires

describe("buildBookingConfirmationEmail", () => {
  it("incluye el servicio, la fecha, el precio y el link de autogestión", () => {
    const { subject, text } = buildBookingConfirmationEmail({
      fullName: "Ana Pérez",
      serviceName: "Corte clásico",
      startsAt: STARTS_AT,
      price: 8000,
      manageUrl: "https://houssestudio.com/turno/abc123",
    });

    expect(subject).toContain("solicitud");
    expect(text).toContain("Ana Pérez");
    expect(text).toContain("Corte clásico");
    expect(text).toContain(formatDateTime(STARTS_AT));
    expect(text).toContain(formatCurrency(8000));
    expect(text).toContain("https://houssestudio.com/turno/abc123");
  });
});

describe("buildNewRequestAlertEmail", () => {
  it("incluye los datos del cliente y del turno para el barbero", () => {
    const { subject, text } = buildNewRequestAlertEmail({
      fullName: "Ana Pérez",
      phone: "3425331802",
      serviceName: "Corte clásico",
      startsAt: STARTS_AT,
      price: 8000,
    });

    expect(subject).toContain("Corte clásico");
    expect(text).toContain("Ana Pérez");
    expect(text).toContain("3425331802");
    expect(text).toContain(formatDateTime(STARTS_AT));
  });
});

describe("buildCancellationClientEmail", () => {
  it("avisa al cliente y muestra el motivo cuando lo hay", () => {
    const { subject, text } = buildCancellationClientEmail({
      fullName: "Ana Pérez",
      serviceName: "Corte clásico",
      startsAt: STARTS_AT,
      reason: "Se superpuso con otro turno",
      cancelledBy: "barbero",
    });

    expect(subject).toContain("cancel");
    expect(text).toContain("Ana Pérez");
    expect(text).toContain(formatDateTime(STARTS_AT));
    expect(text).toContain("Se superpuso con otro turno");
  });

  it("no menciona motivo cuando no hay ninguno", () => {
    const { text } = buildCancellationClientEmail({
      fullName: "Ana Pérez",
      serviceName: "Corte clásico",
      startsAt: STARTS_AT,
      reason: null,
      cancelledBy: "cliente",
    });

    expect(text).not.toContain("Motivo");
  });
});

describe("buildCancellationAdminEmail", () => {
  it("distingue si canceló el cliente o el barbero", () => {
    const cliente = buildCancellationAdminEmail({
      fullName: "Ana Pérez",
      serviceName: "Corte clásico",
      startsAt: STARTS_AT,
      reason: null,
      cancelledBy: "cliente",
    });
    const barbero = buildCancellationAdminEmail({
      fullName: "Ana Pérez",
      serviceName: "Corte clásico",
      startsAt: STARTS_AT,
      reason: null,
      cancelledBy: "barbero",
    });

    expect(cliente.text).toContain("el cliente");
    expect(barbero.text).not.toContain("el cliente canceló");
  });
});
