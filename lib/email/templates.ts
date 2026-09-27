import { BUSINESS_NAME, siteUrl } from "@/lib/config";
import {
  badge,
  button,
  cancellationNote,
  dateBlock,
  detailTable,
  emailDocument,
  eyebrow,
  formatEmailDate,
  formatTimeRange,
  intro,
  note,
  title,
  type DetailRow,
} from "@/lib/email/layout";
import { businessDateKey, formatCurrency } from "@/lib/format";

/**
 * Contenido de los emails transaccionales (design/Emails.dc.html) — funciones
 * puras, sin red ni base, para poder testearlas igual que
 * `lib/availability.ts`. Cada una devuelve el HTML y su versión en texto
 * plano con los mismos datos.
 *
 * Los datos llegan crudos: el escape lo hacen las piezas de
 * `lib/email/layout.ts`. Las URLs absolutas (logo, panel, portal) salen de
 * `siteUrl()`.
 */

export type EmailContent = {
  subject: string;
  /** Resumen que las bandejas muestran junto al asunto. */
  preheader: string;
  html: string;
  text: string;
};

type AppointmentTime = { startsAt: string; endsAt: string };

/** "Sábado 15 de agosto · 14:30 – 15:15 h". */
function when({ startsAt, endsAt }: AppointmentTime) {
  return `${formatEmailDate(startsAt)} · ${formatTimeRange(startsAt, endsAt)}`;
}

function firstName(fullName: string) {
  return fullName.trim().split(/\s+/)[0] || fullName;
}

/** Líneas "Label: valor" del texto plano, con las mismas filas que el HTML. */
function textRows(rows: DetailRow[]) {
  return rows.map((row) => `${row.label}: ${row.value}`);
}

// ---------------------------------------------------------------------------
// 1a · Solicitud recibida (cliente)
// ---------------------------------------------------------------------------

export function buildBookingConfirmationEmail(
  data: AppointmentTime & {
    fullName: string;
    serviceName: string;
    price: number;
    manageUrl: string;
  },
): EmailContent {
  const subject = `Recibimos tu solicitud de turno — ${BUSINESS_NAME}`;
  const preheader = `${when(data)} · ${data.serviceName}`;
  const rows: DetailRow[] = [
    { label: "Servicio", value: data.serviceName },
    { label: "Precio", value: formatCurrency(data.price) },
    { label: "A nombre de", value: data.fullName },
  ];

  return {
    subject,
    preheader,
    html: emailDocument({
      subject,
      preheader,
      audience: "cliente",
      baseUrl: siteUrl(),
      body: [
        badge("pendiente"),
        title("Turno solicitado"),
        intro(
          `Hola ${firstName(data.fullName)}, recibimos tu solicitud. Te vamos a escribir por acá en cuanto quede confirmada.`,
        ),
        dateBlock(data),
        detailTable(rows),
        button({ label: "Seguir mi turno", href: data.manageUrl }),
        note("Sin seña: pagás en el local."),
      ].join(""),
    }),
    text: [
      `Hola ${firstName(data.fullName)},`,
      "",
      "Recibimos tu solicitud de turno. Te vamos a escribir por acá en cuanto quede confirmada.",
      "",
      when(data),
      ...textRows(rows),
      "",
      `Seguí tu turno en: ${data.manageUrl}`,
      "",
      "Sin seña: pagás en el local.",
    ].join("\n"),
  };
}

// ---------------------------------------------------------------------------
// 2a · Nueva solicitud (peluquero)
// ---------------------------------------------------------------------------

export function buildNewRequestAlertEmail(
  data: AppointmentTime & {
    fullName: string;
    phone: string;
    serviceName: string;
    price: number;
  },
): EmailContent {
  const subject = `Nueva solicitud — ${data.serviceName}`;
  const heading = `${data.fullName} pidió un turno`;
  const preheader = `${when(data)} · ${data.serviceName}`;
  const url = `${siteUrl()}/admin/solicitudes`;
  const rows: DetailRow[] = [
    { label: "Servicio", value: data.serviceName },
    { label: "Precio", value: formatCurrency(data.price) },
    { label: "Teléfono", value: data.phone, href: `tel:${data.phone}` },
  ];

  return {
    subject,
    preheader,
    html: emailDocument({
      subject,
      preheader,
      audience: "panel",
      baseUrl: siteUrl(),
      body: [
        eyebrow("Nueva solicitud"),
        title(heading, { marginTop: 0 }),
        dateBlock({ ...data, badge: "pendiente", marginTop: 28 }),
        detailTable(rows),
        button({ label: "Ver solicitudes", href: url, marginTop: 28 }),
      ].join(""),
    }),
    text: [heading + ".", "", when(data), ...textRows(rows), "", `Ver solicitudes: ${url}`].join(
      "\n",
    ),
  };
}

// ---------------------------------------------------------------------------
// 1c / 2b · Turno cancelado
// ---------------------------------------------------------------------------

export type CancellationData = AppointmentTime & {
  fullName: string;
  serviceName: string;
  reason: string | null;
  cancelledBy: "cliente" | "barbero";
};

function reasonRow(reason: string | null): DetailRow[] {
  const trimmed = reason?.trim();
  return trimmed ? [{ label: "Motivo", value: trimmed }] : [];
}

export function buildCancellationClientEmail(data: CancellationData): EmailContent {
  const subject = `Turno cancelado — ${BUSINESS_NAME}`;
  const preheader = `Cancelado: ${when(data)} · ${data.serviceName}`;
  const url = `${siteUrl()}/`;
  const rows: DetailRow[] = [
    { label: "Servicio", value: data.serviceName },
    ...reasonRow(data.reason),
  ];

  return {
    subject,
    preheader,
    html: emailDocument({
      subject,
      preheader,
      audience: "cliente",
      baseUrl: siteUrl(),
      body: [
        badge("cancelado"),
        title("Turno cancelado"),
        intro(`Hola ${firstName(data.fullName)}, tu turno fue cancelado.`),
        dateBlock({ ...data, cancelled: true }),
        detailTable(rows),
        button({ label: "Reservar otro turno", href: url, variant: "secondary" }),
      ].join(""),
    }),
    text: [
      `Hola ${firstName(data.fullName)},`,
      "",
      "Tu turno fue cancelado.",
      "",
      when(data),
      ...textRows(rows),
      "",
      `Reservá otro turno en: ${url}`,
    ].join("\n"),
  };
}

export function buildCancellationAdminEmail(data: CancellationData): EmailContent {
  const subject = `Turno cancelado — ${data.serviceName}`;
  const heading =
    data.cancelledBy === "cliente"
      ? `${data.fullName} canceló su turno`
      : `Cancelaste el turno de ${data.fullName}`;
  const preheader = `Cancelado: ${when(data)} · ${data.serviceName}`;
  const url = `${siteUrl()}/admin/agenda?vista=dia&fecha=${businessDateKey(data.startsAt)}`;
  const rows: DetailRow[] = [
    { label: "Cliente", value: data.fullName },
    { label: "Servicio", value: data.serviceName },
    ...reasonRow(data.reason),
  ];

  return {
    subject,
    preheader,
    html: emailDocument({
      subject,
      preheader,
      audience: "panel",
      baseUrl: siteUrl(),
      body: [
        eyebrow("Turno cancelado"),
        title(heading, { marginTop: 0 }),
        intro("El horario quedó libre en la agenda."),
        dateBlock({ ...data, cancelled: true, badge: "cancelado", marginTop: 28 }),
        detailTable(rows),
        button({ label: "Abrir agenda", href: url, variant: "secondary", marginTop: 28 }),
      ].join(""),
    }),
    text: [
      heading + ".",
      "El horario quedó libre en la agenda.",
      "",
      when(data),
      ...textRows(rows),
      "",
      `Abrir agenda: ${url}`,
    ].join("\n"),
  };
}

// ---------------------------------------------------------------------------
// 1b · Turno confirmado (cliente) — y su variante de recordatorio (E5)
// ---------------------------------------------------------------------------

export type ConfirmedData = AppointmentTime & {
  fullName: string;
  serviceName: string;
  price: number;
  /**
   * Link de autogestión, o `null` para un turno reservado antes de derivar
   * los tokens (ver `lib/tokens.ts`): ahí el mail sale sin botón y la nota
   * remite al link de la reserva.
   */
  manageUrl: string | null;
  /** `settings.cancellation_window_hours`, leído al momento del envío. */
  cancellationWindowHours: number;
};

/** Layout de 1b; el recordatorio lo reusa cambiando asunto, título y saludo. */
function confirmedStyleEmail(
  data: ConfirmedData,
  copy: { subject: string; heading: string; greeting: string; preheaderPrefix: string },
): EmailContent {
  const preheader = `${copy.preheaderPrefix}${when(data)} · ${data.serviceName}`;
  const rows: DetailRow[] = [
    { label: "Servicio", value: data.serviceName },
    { label: "Precio", value: formatCurrency(data.price) },
    { label: "A nombre de", value: data.fullName },
  ];
  const cancelNote = cancellationNote(
    data.cancellationWindowHours,
    data.manageUrl ? "el mismo link" : "el link de tu reserva",
  );

  return {
    subject: copy.subject,
    preheader,
    html: emailDocument({
      subject: copy.subject,
      preheader,
      audience: "cliente",
      baseUrl: siteUrl(),
      body: [
        badge("confirmado"),
        title(copy.heading),
        intro(copy.greeting),
        dateBlock(data),
        detailTable(rows),
        data.manageUrl ? button({ label: "Ver mi turno", href: data.manageUrl }) : "",
        note(cancelNote),
      ].join(""),
    }),
    text: [
      copy.greeting,
      "",
      when(data),
      ...textRows(rows),
      ...(data.manageUrl ? ["", `Ver mi turno: ${data.manageUrl}`] : []),
      "",
      cancelNote,
    ].join("\n"),
  };
}

export function buildAppointmentConfirmedEmail(data: ConfirmedData): EmailContent {
  return confirmedStyleEmail(data, {
    subject: `Tu turno está confirmado — ${BUSINESS_NAME}`,
    heading: "¡Te esperamos!",
    greeting: `Hola ${firstName(data.fullName)}, tu turno está confirmado.`,
    preheaderPrefix: "Confirmado: ",
  });
}
