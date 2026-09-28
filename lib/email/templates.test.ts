import { describe, expect, it } from "vitest";

import { formatCurrency } from "@/lib/format";
import {
  buildAppointmentConfirmedEmail,
  buildBookingConfirmationEmail,
  buildCancellationAdminEmail,
  buildCancellationClientEmail,
  buildNewRequestAlertEmail,
  buildReminderEmail,
  type CancellationData,
  type EmailContent,
} from "@/lib/email/templates";

// Sábado 15 de agosto, 14:30 a 15:15 en Buenos Aires.
const TIME = { startsAt: "2026-08-15T17:30:00.000Z", endsAt: "2026-08-15T18:15:00.000Z" };
const HOSTILE = `Ana <script>alert("x")</script>`;

/** Lo que tienen que cumplir los seis mails, sea cual sea. */
function expectWellFormed(email: EmailContent) {
  expect(email.html).toContain("Sábado 15 de agosto");
  expect(email.html).toContain("14:30 – 15:15 h");
  expect(email.text).toContain("Sábado 15 de agosto · 14:30 – 15:15 h");
  expect(email.preheader).toContain("Sábado 15 de agosto");
  expect(email.html).not.toMatch(/display:\s*(flex|grid)/);
  expect(email.html).not.toMatch(/\sclass=/);
  // Texto plano sin etiquetas: es el que leen los clientes sin HTML.
  expect(email.text).not.toMatch(/<[a-z]/i);
}

describe("1a · buildBookingConfirmationEmail", () => {
  const email = buildBookingConfirmationEmail({
    ...TIME,
    fullName: "Ana Pérez",
    serviceName: "Corte clásico",
    price: 8000,
    manageUrl: "https://houssestudio.com/turno/abc123",
  });

  it("asunto, título, badge pendiente y saludo por el nombre", () => {
    expect(email.subject).toBe("Recibimos tu solicitud de turno — HOUSSESTUDIO");
    expect(email.html).toContain("Turno solicitado");
    expect(email.html).toContain("#fef3c7");
    expect(email.html).toContain("Hola Ana, recibimos tu solicitud.");
    expectWellFormed(email);
  });

  it("detalle con servicio, precio y nombre, CTA al turno y nota de la seña", () => {
    for (const part of ["Corte clásico", formatCurrency(8000), "Ana Pérez", "Sin seña: pagás en el local."]) {
      expect(email.html).toContain(part);
      expect(email.text).toContain(part);
    }
    expect(email.html).toContain('href="https://houssestudio.com/turno/abc123"');
    expect(email.html).toContain("Seguir mi turno");
    expect(email.text).toContain("https://houssestudio.com/turno/abc123");
  });
});

describe("2a · buildNewRequestAlertEmail", () => {
  const email = buildNewRequestAlertEmail({
    ...TIME,
    fullName: "Ana Pérez",
    phone: "3425331802",
    serviceName: "Corte clásico",
    price: 8000,
  });

  it("título con el cliente, header del panel y badge pendiente", () => {
    expect(email.subject).toBe("Nueva solicitud — Corte clásico");
    expect(email.html).toContain("Ana Pérez pidió un turno");
    expect(email.html).toContain(">Panel</td>");
    expect(email.html).toContain("#fef3c7");
    expectWellFormed(email);
  });

  it("teléfono como tel:, precio y CTA a Solicitudes", () => {
    expect(email.html).toContain('href="tel:3425331802"');
    expect(email.html).toContain(formatCurrency(8000));
    expect(email.html).toMatch(/href="[^"]*\/admin\/solicitudes"/);
    expect(email.text).toContain("Teléfono: 3425331802");
  });
});

const cancellation = (overrides: Partial<CancellationData> = {}): CancellationData => ({
  ...TIME,
  fullName: "Ana Pérez",
  serviceName: "Corte clásico",
  reason: "Me surgió un viaje",
  cancelledBy: "cliente",
  ...overrides,
});

describe("1c · buildCancellationClientEmail", () => {
  it("fecha tachada, badge cancelado, motivo y CTA secundario a reservar", () => {
    const email = buildCancellationClientEmail(cancellation());
    expect(email.subject).toBe("Turno cancelado — HOUSSESTUDIO");
    expect(email.html).toContain("Turno cancelado");
    expect(email.html).toContain("line-through");
    expect(email.html).toContain("#a3a3a3");
    expect(email.html).toContain("Me surgió un viaje");
    expect(email.text).toContain("Motivo: Me surgió un viaje");
    expect(email.html).toContain("Reservar otro turno");
    expect(email.html).toContain("border:1px solid #b8bdc3");
    expectWellFormed(email);
  });

  it("sin motivo no hay fila de motivo", () => {
    const email = buildCancellationClientEmail(cancellation({ reason: null }));
    expect(email.html).not.toContain("Motivo");
    expect(email.text).not.toContain("Motivo");
    // Un motivo de puros espacios tampoco cuenta.
    expect(buildCancellationClientEmail(cancellation({ reason: "   " })).html).not.toContain("Motivo");
  });
});

describe("2b · buildCancellationAdminEmail", () => {
  it("el título depende de quién canceló", () => {
    expect(buildCancellationAdminEmail(cancellation({ cancelledBy: "cliente" })).html).toContain(
      "Ana Pérez canceló su turno",
    );
    expect(buildCancellationAdminEmail(cancellation({ cancelledBy: "barbero" })).html).toContain(
      "Cancelaste el turno de Ana Pérez",
    );
  });

  it("subtítulo, detalle con cliente, servicio y motivo, y CTA a la agenda de ese día", () => {
    const email = buildCancellationAdminEmail(cancellation());
    expect(email.subject).toBe("Turno cancelado — Corte clásico");
    expect(email.html).toContain("El horario quedó libre en la agenda.");
    for (const part of ["Cliente", "Ana Pérez", "Corte clásico", "Me surgió un viaje"]) {
      expect(email.html).toContain(part);
    }
    expect(email.html).toMatch(/href="[^"]*\/admin\/agenda\?vista=dia&amp;fecha=2026-08-15"/);
    expect(email.html).toContain("line-through");
    expectWellFormed(email);
  });
});

describe("escape de datos del usuario", () => {
  it("nombre y motivo llegan escapados al HTML en los cuatro mails", () => {
    const emails = [
      buildBookingConfirmationEmail({ ...TIME, fullName: HOSTILE, serviceName: "Corte", price: 1, manageUrl: "https://x.test" }),
      buildNewRequestAlertEmail({ ...TIME, fullName: HOSTILE, phone: "1", serviceName: "Corte", price: 1 }),
      buildCancellationClientEmail(cancellation({ fullName: HOSTILE, reason: HOSTILE })),
      buildCancellationAdminEmail(cancellation({ fullName: HOSTILE, reason: HOSTILE })),
    ];
    for (const { html } of emails) {
      expect(html).not.toContain("<script>");
      expect(html).toContain("&lt;script&gt;");
    }
  });
});

describe("1b · buildAppointmentConfirmedEmail", () => {
  const confirmed = (overrides: Partial<Parameters<typeof buildAppointmentConfirmedEmail>[0]> = {}) =>
    buildAppointmentConfirmedEmail({
      ...TIME,
      fullName: "Ana Pérez",
      serviceName: "Corte clásico",
      price: 8000,
      manageUrl: "https://houssestudio.com/turno/abc123",
      cancellationWindowHours: 2,
      ...overrides,
    });

  it("asunto, título, badge confirmado, detalle y CTA al turno", () => {
    const email = confirmed();
    expect(email.subject).toBe("Tu turno está confirmado — HOUSSESTUDIO");
    expect(email.html).toContain("¡Te esperamos!");
    expect(email.html).toContain("Hola Ana, tu turno está confirmado.");
    expect(email.html).toContain("#d1fae5");
    for (const part of ["Corte clásico", formatCurrency(8000), "Ana Pérez"]) {
      expect(email.html).toContain(part);
    }
    expect(email.html).toContain('href="https://houssestudio.com/turno/abc123"');
    expect(email.html).toContain("Ver mi turno");
    expectWellFormed(email);
  });

  it("la nota usa el plazo configurado: 0, 1 y 3 horas", () => {
    expect(confirmed({ cancellationWindowHours: 3 }).html).toContain(
      "Cancelalo desde el mismo link hasta 3 horas antes.",
    );
    expect(confirmed({ cancellationWindowHours: 1 }).text).toContain("hasta 1 hora antes.");
    expect(confirmed({ cancellationWindowHours: 0 }).html).toContain(
      "Cancelalo desde el mismo link hasta el horario del turno.",
    );
  });

  it("sin link (turno anterior a los tokens derivados): sin botón y la nota no promete uno", () => {
    const email = confirmed({ manageUrl: null });
    expect(email.html).not.toContain("Ver mi turno");
    expect(email.html).not.toContain("/turno/");
    expect(email.html).toContain("Cancelalo desde el link de tu reserva hasta 2 horas antes.");
    expect(email.text).not.toContain("Ver mi turno");
  });

  it("el nombre llega escapado", () => {
    expect(confirmed({ fullName: HOSTILE }).html).not.toContain("<script>");
  });
});

describe("recordatorio · buildReminderEmail", () => {
  const reminder = (overrides: Partial<Parameters<typeof buildReminderEmail>[0]> = {}) =>
    buildReminderEmail({
      ...TIME,
      fullName: "Ana Pérez",
      serviceName: "Corte clásico",
      price: 8000,
      manageUrl: "https://houssestudio.com/turno/abc123",
      cancellationWindowHours: 2,
      ...overrides,
    });

  it("layout de 1b con el título del recordatorio", () => {
    const email = reminder();
    expect(email.subject).toBe("Mañana te esperamos — HOUSSESTUDIO");
    expect(email.html).toContain("Mañana te esperamos");
    expect(email.html).toContain("Hola Ana, te recordamos tu turno de mañana.");
    expect(email.html).toContain("#d1fae5");
    expect(email.html).toContain("Ver mi turno");
    expect(email.preheader).toMatch(/^Mañana: Sábado 15 de agosto/);
    expectWellFormed(email);
  });

  it("misma nota y mismo plazo que 1b", () => {
    const data = { cancellationWindowHours: 3 };
    expect(reminder(data).html).toContain("hasta 3 horas antes.");
    expect(reminder({ cancellationWindowHours: 0 }).html).toContain("hasta el horario del turno.");
    expect(reminder({ manageUrl: null }).html).toContain("desde el link de tu reserva");
  });
});
