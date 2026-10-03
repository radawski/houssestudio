import { describe, expect, it } from "vitest";

import { buildOutOfAreaMessage } from "@/lib/out-of-area-message";

const booking = { serviceName: "Corte de pelo", dateLabel: "viernes, 9 de octubre", timeLabel: "09:00" };

describe("buildOutOfAreaMessage", () => {
  it("arranca con el pedido del turno, sin darlo por reservado", () => {
    expect(buildOutOfAreaMessage(booking, null).split("\n")[0]).toBe(
      "Hola, tengo una línea de otra localidad y quería agendar un turno para el viernes, 9 de octubre a las 09:00 para el servicio Corte de pelo.",
    );
  });

  it("suma los datos del cliente, uno por línea, para cargarlos sin preguntar", () => {
    const message = buildOutOfAreaMessage(booking, {
      fullName: "Martín Pérez",
      dni: "30123456",
      phone: "11 2345-6789",
      email: "martin@example.com",
    });
    expect(message).toContain("\n\nMis datos:\nNombre: Martín Pérez\nDNI: 30123456\nTeléfono: 11 2345-6789\nEmail: martin@example.com");
  });

  it("omite los datos vacíos en vez de dejar renglones sin valor", () => {
    const message = buildOutOfAreaMessage(booking, { fullName: "Martín Pérez", dni: "30123456", phone: "1123456789", email: "  " });
    expect(message).not.toContain("Email:");
    expect(message).toContain("Teléfono: 1123456789");
  });

  it("sin ningún dato no agrega el bloque", () => {
    const message = buildOutOfAreaMessage(booking, { fullName: "", dni: "", phone: "", email: "" });
    expect(message).not.toContain("Mis datos");
  });

  it("recorta espacios sobrantes de lo que escribió el cliente", () => {
    const message = buildOutOfAreaMessage(booking, { fullName: "  Martín  ", dni: "", phone: "", email: "" });
    expect(message.endsWith("\nNombre: Martín")).toBe(true);
  });
});
