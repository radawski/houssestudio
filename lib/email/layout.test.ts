import { describe, expect, it } from "vitest";

import {
  badge,
  button,
  cancellationNote,
  dateBlock,
  detailTable,
  emailDocument,
  escapeHtml,
  formatCancellationWindow,
  formatEmailDate,
  formatTimeRange,
  intro,
  title,
} from "@/lib/email/layout";

// 17:30 UTC = 14:30 en Buenos Aires.
const STARTS = "2026-08-15T17:30:00Z";
const ENDS = "2026-08-15T18:15:00Z";

describe("escapeHtml", () => {
  it("escapa lo que podría abrir o cerrar HTML", () => {
    expect(escapeHtml(`<script>alert("x")</script> & 'y'`)).toBe(
      "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; &#39;y&#39;",
    );
  });
});

describe("plazo de cancelación", () => {
  it("1 → «1 hora», 2 o más → «n horas»", () => {
    expect(formatCancellationWindow(1)).toBe("1 hora");
    expect(formatCancellationWindow(2)).toBe("2 horas");
    expect(formatCancellationWindow(24)).toBe("24 horas");
  });

  it("0 no es un plazo en horas: la nota dice «hasta el horario del turno»", () => {
    expect(formatCancellationWindow(0)).toBeNull();
    expect(cancellationNote(0)).toBe(
      "¿No podés venir? Cancelalo desde el mismo link hasta el horario del turno.",
    );
  });

  it("la nota usa el valor configurado", () => {
    expect(cancellationNote(3)).toBe(
      "¿No podés venir? Cancelalo desde el mismo link hasta 3 horas antes.",
    );
    expect(cancellationNote(1)).toContain("hasta 1 hora antes.");
  });
});

describe("fecha y horario", () => {
  it("fecha larga con mayúscula inicial y rango en la zona del local", () => {
    expect(formatEmailDate(STARTS)).toBe("Sábado 15 de agosto");
    expect(formatTimeRange(STARTS, ENDS)).toBe("14:30 – 15:15 h");
  });

  it("cancelado: la fecha va tachada", () => {
    expect(dateBlock({ startsAt: STARTS, endsAt: ENDS, cancelled: true })).toContain(
      "text-decoration:line-through",
    );
    expect(dateBlock({ startsAt: STARTS, endsAt: ENDS })).not.toContain("line-through");
  });
});

describe("piezas", () => {
  it("el badge usa los colores de cada estado", () => {
    expect(badge("pendiente")).toContain("#fef3c7");
    expect(badge("pendiente")).toContain("#b45309");
    expect(badge("confirmado")).toContain("#d1fae5");
    expect(badge("confirmado")).toContain("#059669");
    expect(badge("cancelado")).toContain("#a3a3a3");
  });

  it("el botón es una tabla con el <a> en bloque adentro", () => {
    const primary = button({ label: "Ver mi turno", href: "https://x.test/turno/abc" });
    expect(primary).toMatch(/<td[^>]*bgcolor="#111315"[^>]*><a href="https:\/\/x\.test\/turno\/abc" style="display:block;/);
    const secondary = button({ label: "Abrir agenda", href: "https://x.test", variant: "secondary" });
    expect(secondary).toContain("border:1px solid #b8bdc3");
    expect(secondary).not.toContain("bgcolor");
  });

  it("los datos del usuario llegan escapados", () => {
    const hostile = `<img src=x onerror=alert(1)>`;
    for (const html of [
      title(hostile),
      intro(hostile),
      detailTable([{ label: "Motivo", value: hostile }]),
      button({ label: hostile, href: "https://x.test" }),
    ]) {
      expect(html).not.toContain("<img src=x");
      expect(html).toContain("&lt;img src=x");
    }
  });

  it("la tabla de detalle puede llevar un link (teléfono)", () => {
    expect(detailTable([{ label: "Teléfono", value: "3425331802", href: "tel:3425331802" }])).toContain(
      'href="tel:3425331802"',
    );
  });
});

describe("emailDocument", () => {
  const doc = (audience: "cliente" | "panel") =>
    emailDocument({
      subject: "Asunto",
      preheader: "Sábado 15 de agosto · Corte de pelo",
      audience,
      baseUrl: "https://houssestudio.vercel.app",
      body: title("Turno solicitado") + dateBlock({ startsAt: STARTS, endsAt: ENDS }),
    });

  it("solo tablas y estilos inline: sin flex, grid, clases ni mix-blend-mode", () => {
    for (const html of [doc("cliente"), doc("panel")]) {
      expect(html).not.toMatch(/display:\s*(flex|grid)/);
      expect(html).not.toMatch(/\sclass=/);
      expect(html).not.toContain("mix-blend-mode");
      expect(html).toContain('<table role="presentation"');
    }
  });

  it("viewport, ancho fluido de hasta 600px y preheader oculto", () => {
    const html = doc("cliente");
    expect(html).toContain('<meta name="viewport" content="width=device-width, initial-scale=1">');
    expect(html).toContain("width:100%;max-width:600px");
    expect(html).toMatch(/<div style="display:none;[^"]*">Sábado 15 de agosto · Corte de pelo/);
  });

  it("logo con URL absoluta, medidas fijas y alt; header según destinatario", () => {
    const cliente = doc("cliente");
    expect(cliente).toContain(
      'src="https://houssestudio.vercel.app/email/logo-92.png" alt="HOUSSESTUDIO" width="46" height="52"',
    );
    expect(cliente).toContain("Peluquería");
    expect(cliente).toContain("Recibís este email porque pediste un turno.");

    const panel = doc("panel");
    expect(panel).toContain('logo-56.png" alt="HOUSSESTUDIO" width="28" height="31"');
    expect(panel).toContain(">Panel</td>");
    expect(panel).toContain("Aviso automático del panel de turnos.");
  });
});
