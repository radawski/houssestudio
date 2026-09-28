import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { siteUrl } from "@/lib/config";
import {
  buildAppointmentConfirmedEmail,
  buildBookingConfirmationEmail,
  buildCancellationAdminEmail,
  buildCancellationClientEmail,
  buildNewRequestAlertEmail,
  buildReminderEmail,
  type EmailContent,
} from "@/lib/email/templates";

export const metadata: Metadata = { title: "Preview de emails", robots: { index: false } };

/**
 * Vista previa de los emails transaccionales, solo en desarrollo
 * (`npm run dev` → /dev/emails). Renderiza cada mail con datos de ejemplo en
 * dos anchos, 375px (celular) y 600px (el máximo de la tarjeta), y su versión
 * en texto plano. En producción responde 404.
 *
 * Los `iframe` usan `srcDoc`: el HTML del mail se muestra aislado, sin los
 * estilos de la app, igual que en un cliente de correo.
 */

const TIME = { startsAt: "2026-08-15T17:30:00.000Z", endsAt: "2026-08-15T18:15:00.000Z" };
const CLIENT = { fullName: "Martín Gómez", serviceName: "Corte + barba", price: 8000 };

function samples(): { id: string; label: string; email: EmailContent }[] {
  const manageUrl = `${siteUrl()}/turno/token-de-ejemplo`;
  const cancellation = {
    ...TIME,
    ...CLIENT,
    reason: "Me surgió un viaje de trabajo",
    cancelledBy: "cliente" as const,
  };

  return [
    { id: "1a", label: "1a · Solicitud recibida (cliente)", email: buildBookingConfirmationEmail({ ...TIME, ...CLIENT, manageUrl }) },
    {
      id: "1b",
      label: "1b · Turno confirmado (cliente), plazo de 2 horas",
      email: buildAppointmentConfirmedEmail({ ...TIME, ...CLIENT, manageUrl, cancellationWindowHours: 2 }),
    },
    {
      id: "1b-sin-link",
      label: "1b · Turno reservado antes de los tokens derivados: sin botón, plazo 0",
      email: buildAppointmentConfirmedEmail({ ...TIME, ...CLIENT, manageUrl: null, cancellationWindowHours: 0 }),
    },
    { id: "1c", label: "1c · Turno cancelado (cliente), con motivo", email: buildCancellationClientEmail(cancellation) },
    {
      id: "1c-sin-motivo",
      label: "1c · Turno cancelado (cliente), sin motivo",
      email: buildCancellationClientEmail({ ...cancellation, reason: null }),
    },
    {
      id: "2a",
      label: "2a · Nueva solicitud (peluquero), nombre con caracteres especiales",
      email: buildNewRequestAlertEmail({ ...TIME, ...CLIENT, fullName: `Martín O'Connor <test> & Cía`, phone: "3425331802" }),
    },
    { id: "2b", label: "2b · Canceló el cliente (peluquero)", email: buildCancellationAdminEmail(cancellation) },
    {
      id: "2b-peluquero",
      label: "2b · Canceló el peluquero (peluquero), sin motivo",
      email: buildCancellationAdminEmail({ ...cancellation, cancelledBy: "barbero", reason: null }),
    },
    {
      id: "recordatorio",
      label: "Recordatorio (cliente), plazo de 1 hora",
      email: buildReminderEmail({ ...TIME, ...CLIENT, manageUrl, cancellationWindowHours: 1 }),
    },
  ];
}

export default function EmailPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();

  const list = samples();

  return (
    <main style={{ padding: 24, background: "#eceef1", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ margin: "0 0 4px", fontSize: 22 }}>Preview de emails</h1>
      <p style={{ margin: "0 0 16px", color: "#4a4f55", fontSize: 14 }}>
        Solo en desarrollo. Cada mail a 375px y 600px, con su versión en texto plano.
      </p>
      <nav style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 24 }}>
        {list.map(({ id }) => (
          <a key={id} href={`#${id}`} style={{ fontSize: 13, color: "#111315" }}>
            {id}
          </a>
        ))}
      </nav>

      {list.map(({ id, label, email }) => (
        <section key={id} id={id} style={{ marginBottom: 48 }}>
          <h2 style={{ margin: "0 0 4px", fontSize: 16 }}>{label}</h2>
          <p style={{ margin: 0, fontSize: 13, color: "#4a4f55" }}>
            <strong>Asunto:</strong> {email.subject}
          </p>
          <p style={{ margin: "2px 0 12px", fontSize: 13, color: "#4a4f55" }}>
            <strong>Preheader:</strong> {email.preheader}
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "flex-start" }}>
            {[375, 600].map((width) => (
              <figure key={width} style={{ margin: 0 }}>
                <figcaption style={{ fontSize: 12, color: "#4a4f55", marginBottom: 4 }}>{width}px</figcaption>
                <iframe
                  title={`${label} a ${width}px`}
                  srcDoc={email.html}
                  style={{ width, height: 900, border: "1px solid #b8bdc3", background: "#fff" }}
                />
              </figure>
            ))}
          </div>
          <details style={{ marginTop: 8 }}>
            <summary style={{ fontSize: 13, cursor: "pointer" }}>Texto plano</summary>
            <pre style={{ whiteSpace: "pre-wrap", fontSize: 13, background: "#fff", padding: 12, border: "1px solid #dde0e4", maxWidth: 600 }}>
              {email.text}
            </pre>
          </details>
        </section>
      ))}
    </main>
  );
}
