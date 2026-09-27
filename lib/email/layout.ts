import { BUSINESS_NAME } from "@/lib/config";
import { formatLongDate, formatTime } from "@/lib/format";

/**
 * Piezas del HTML de los emails (design/Emails.dc.html), funciones puras que
 * devuelven texto.
 *
 * Todo va maquetado con `<table role="presentation">` y estilos inline: es lo
 * único que Gmail, Outlook y Apple Mail interpretan igual. Nada de flex,
 * grid, clases ni `mix-blend-mode` (la referencia usa esas cosas para el
 * lienzo de diseño, no para el mail real).
 *
 * Todo dato que venga del usuario (nombre, motivo, servicio, teléfono) pasa
 * por `escapeHtml` dentro de estas piezas, así que quien las usa pasa texto
 * crudo, nunca HTML armado a mano.
 */

export const EMAIL_COLORS = {
  page: "#f4f5f7",
  card: "#ffffff",
  cardBorder: "#dde0e4",
  header: "#050505",
  ink: "#111315",
  paper: "#f4f5f7",
  slate: "#4a4f55",
  mist: "#b8bdc3",
  divider: "#eceef1",
} as const;

const FONT = "Roboto, Helvetica, Arial, sans-serif";

/** Estados del badge, con los colores del pedido (fondo, borde, texto, punto). */
const BADGES = {
  pendiente: { label: "Pendiente", bg: "#fef3c7", border: "#fde68a", text: "#78350f", dot: "#b45309" },
  confirmado: { label: "Confirmado", bg: "#d1fae5", border: "#a7f3d0", text: "#064e3b", dot: "#059669" },
  cancelado: { label: "Cancelado", bg: "#f5f5f5", border: "#e5e5e5", text: "#525252", dot: "#a3a3a3" },
} as const;

export type BadgeStatus = keyof typeof BADGES;

/** Logo con transparencia, en el doble de su tamaño de dibujo (pantallas retina). */
export const EMAIL_LOGOS = {
  cliente: { path: "/email/logo-92.png", width: 46, height: 52 },
  panel: { path: "/email/logo-56.png", width: 28, height: 31 },
} as const;

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Plazo de cancelación en palabras, a partir de
 * `settings.cancellation_window_hours`: `1` → "1 hora", `n` → "n horas".
 * Con `0` no hay plazo en horas y se devuelve `null` (ver `cancellationNote`).
 */
export function formatCancellationWindow(hours: number): string | null {
  if (hours <= 0) return null;
  return hours === 1 ? "1 hora" : `${hours} horas`;
}

/**
 * Nota de 1b y del recordatorio: "¿No podés venir? Cancelalo … hasta N antes."
 * `where` nombra el link: "el mismo link" cuando el mail trae el botón, "el
 * link de tu reserva" cuando no puede traerlo (turnos anteriores a los tokens
 * derivados, ver `lib/tokens.ts`).
 */
export function cancellationNote(hours: number, where = "el mismo link"): string {
  const window = formatCancellationWindow(hours);
  return window
    ? `¿No podés venir? Cancelalo desde ${where} hasta ${window} antes.`
    : `¿No podés venir? Cancelalo desde ${where} hasta el horario del turno.`;
}

/** "Sábado 15 de agosto", en la zona del local. */
export function formatEmailDate(startsAt: string): string {
  const date = formatLongDate(startsAt);
  return date.charAt(0).toUpperCase() + date.slice(1);
}

/** "14:30 – 15:15 h". */
export function formatTimeRange(startsAt: string, endsAt: string): string {
  return `${formatTime(startsAt)} – ${formatTime(endsAt)} h`;
}

// ---------------------------------------------------------------------------
// Piezas del cuerpo
// ---------------------------------------------------------------------------

/** Rótulo chico en mayúsculas sobre el título (solo en los avisos al peluquero). */
export function eyebrow(text: string): string {
  return `<p style="margin:0 0 12px;font-family:${FONT};font-size:12px;line-height:16px;letter-spacing:0.18em;text-transform:uppercase;color:${EMAIL_COLORS.slate};">${escapeHtml(text)}</p>`;
}

export function badge(status: BadgeStatus): string {
  const b = BADGES[status];
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate;"><tr><td style="height:20px;padding:0 8px;border:1px solid ${b.border};border-radius:10px;background:${b.bg};font-family:${FONT};font-size:12px;line-height:18px;font-weight:500;color:${b.text};white-space:nowrap;"><span style="display:inline-block;width:6px;height:6px;border-radius:3px;background:${b.dot};vertical-align:middle;margin:0 4px 2px 0;"></span>${b.label}</td></tr></table>`;
}

export function title(text: string, { marginTop = 20 }: { marginTop?: number } = {}): string {
  return `<h1 style="margin:${marginTop}px 0 0;font-family:${FONT};font-size:26px;line-height:30px;font-weight:300;letter-spacing:-0.02em;color:${EMAIL_COLORS.ink};">${escapeHtml(text)}</h1>`;
}

/** Párrafo de 15px bajo el título ("Hola Martín, …"). */
export function intro(text: string): string {
  return `<p style="margin:12px 0 0;font-family:${FONT};font-size:15px;line-height:24px;color:${EMAIL_COLORS.slate};">${escapeHtml(text)}</p>`;
}

/**
 * Fecha (22/300) con el horario debajo. Cancelado: la fecha va tachada en
 * gris. Con `badge`, la píldora va a la derecha (avisos al peluquero).
 */
export function dateBlock({
  startsAt,
  endsAt,
  cancelled = false,
  badge: sideBadge,
  marginTop = 32,
}: {
  startsAt: string;
  endsAt: string;
  cancelled?: boolean;
  badge?: BadgeStatus;
  marginTop?: number;
}): string {
  const dateStyle = cancelled
    ? `color:${EMAIL_COLORS.slate};text-decoration:line-through;text-decoration-color:${EMAIL_COLORS.mist};`
    : `color:${EMAIL_COLORS.ink};`;
  const date = `<p style="margin:0;font-family:${FONT};font-size:22px;line-height:28px;font-weight:300;${dateStyle}">${escapeHtml(formatEmailDate(startsAt))}</p><p style="margin:4px 0 0;font-family:${FONT};font-size:15px;line-height:20px;color:${EMAIL_COLORS.slate};">${escapeHtml(formatTimeRange(startsAt, endsAt))}</p>`;

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:${marginTop}px;"><tr><td valign="top">${date}</td>${
    sideBadge ? `<td valign="top" align="right" style="padding-left:16px;">${badge(sideBadge)}</td>` : ""
  }</tr></table>`;
}

export type DetailRow = { label: string; value: string; href?: string };

/** Tabla de detalle: label en mayúsculas a la izquierda, valor a la derecha. */
export function detailTable(rows: DetailRow[]): string {
  const line = `border-top:1px solid ${EMAIL_COLORS.mist};`;
  const body = rows
    .map(({ label, value, href }) => {
      const shown = href
        ? `<a href="${escapeHtml(href)}" style="color:${EMAIL_COLORS.ink};text-decoration:underline;">${escapeHtml(value)}</a>`
        : escapeHtml(value);
      return `<tr><td valign="top" style="${line}padding:12px 0;font-family:${FONT};font-size:12px;line-height:20px;letter-spacing:0.08em;text-transform:uppercase;color:${EMAIL_COLORS.slate};white-space:nowrap;">${escapeHtml(label)}</td><td valign="top" align="right" style="${line}padding:12px 0 12px 16px;font-family:${FONT};font-size:15px;line-height:20px;color:${EMAIL_COLORS.ink};text-align:right;">${shown}</td></tr>`;
    })
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:20px;border-collapse:collapse;border-bottom:1px solid ${EMAIL_COLORS.mist};">${body}</table>`;
}

/**
 * Botón "bulletproof": la celda lleva el fondo o el borde, y el `<a>` va en
 * `display:block` adentro, así toda la franja es tocable y Outlook la pinta
 * aunque ignore el padding de los enlaces. 16 + 16 + 16 = 48px de alto.
 */
export function button({
  label,
  href,
  variant = "primary",
  marginTop = 32,
}: {
  label: string;
  href: string;
  variant?: "primary" | "secondary";
  marginTop?: number;
}): string {
  const primary = variant === "primary";
  const cell = primary
    ? `background:${EMAIL_COLORS.ink};`
    : `border:1px solid ${EMAIL_COLORS.mist};`;
  const padding = primary ? "16px 22px" : "15px 21px";
  const color = primary ? EMAIL_COLORS.paper : EMAIL_COLORS.ink;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:${marginTop}px;"><tr><td align="center"${primary ? ` bgcolor="${EMAIL_COLORS.ink}"` : ""} style="${cell}"><a href="${escapeHtml(href)}" style="display:block;padding:${padding};font-family:${FONT};font-size:13px;line-height:16px;letter-spacing:0.18em;text-transform:uppercase;text-align:center;color:${color};text-decoration:none;">${escapeHtml(label)} &rarr;</a></td></tr></table>`;
}

/** Nota final de 13px bajo el botón. */
export function note(text: string): string {
  return `<p style="margin:14px 0 0;font-family:${FONT};font-size:13px;line-height:20px;color:${EMAIL_COLORS.slate};">${escapeHtml(text)}</p>`;
}

// ---------------------------------------------------------------------------
// Documento
// ---------------------------------------------------------------------------

function logoImg(baseUrl: string, kind: keyof typeof EMAIL_LOGOS): string {
  const logo = EMAIL_LOGOS[kind];
  return `<img src="${escapeHtml(baseUrl + logo.path)}" alt="${BUSINESS_NAME}" width="${logo.width}" height="${logo.height}" style="display:block;width:${logo.width}px;height:${logo.height}px;border:0;outline:none;text-decoration:none;">`;
}

function clientHeader(baseUrl: string): string {
  return `<tr><td bgcolor="${EMAIL_COLORS.header}" style="background:${EMAIL_COLORS.header};padding:28px 24px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td valign="middle">${logoImg(baseUrl, "cliente")}</td><td valign="middle" style="padding-left:16px;"><p style="margin:0;font-family:${FONT};font-size:20px;line-height:20px;font-weight:500;letter-spacing:0.02em;color:#ffffff;">${BUSINESS_NAME}</p><p style="margin:6px 0 0;font-family:${FONT};font-size:11px;line-height:14px;letter-spacing:0.28em;text-transform:uppercase;color:rgba(255,255,255,0.55);">Peluquería</p></td></tr></table></td></tr>`;
}

function panelHeader(baseUrl: string): string {
  return `<tr><td bgcolor="${EMAIL_COLORS.header}" style="background:${EMAIL_COLORS.header};padding:18px 24px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td valign="middle"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td valign="middle">${logoImg(baseUrl, "panel")}</td><td valign="middle" style="padding-left:14px;font-family:${FONT};font-size:13px;line-height:16px;font-weight:500;letter-spacing:0.18em;color:#ffffff;">${BUSINESS_NAME}</td></tr></table></td><td valign="middle" align="right" style="font-family:${FONT};font-size:11px;line-height:14px;letter-spacing:0.28em;text-transform:uppercase;color:rgba(255,255,255,0.55);">Panel</td></tr></table></td></tr>`;
}

function footer(audience: "cliente" | "panel"): string {
  const content =
    audience === "cliente"
      ? `<p style="margin:0;letter-spacing:0.18em;text-transform:uppercase;">${BUSINESS_NAME}</p><p style="margin:6px 0 0;">Recibís este email porque pediste un turno.</p>`
      : `<p style="margin:0;">Aviso automático del panel de turnos.</p>`;
  const padding = audience === "cliente" ? "20px 24px" : "16px 24px";
  return `<tr><td style="border-top:1px solid ${EMAIL_COLORS.divider};padding:${padding};font-family:${FONT};font-size:12px;line-height:18px;color:${EMAIL_COLORS.slate};">${content}</td></tr>`;
}

/**
 * Documento completo: fondo `#f4f5f7`, tarjeta blanca fluida de hasta 600px
 * (Outlook de escritorio ignora `max-width`, por eso la tabla fantasma entre
 * comentarios condicionales), header del cliente o del panel, cuerpo con 24px
 * a los lados y footer.
 *
 * `preheader` es el resumen que muestran las bandejas junto al asunto; va
 * oculto en el cuerpo y seguido de espacios de relleno para que el cliente
 * no complete la vista previa con el texto del mail.
 */
export function emailDocument({
  subject,
  preheader,
  audience,
  baseUrl,
  body,
}: {
  subject: string;
  preheader: string;
  audience: "cliente" | "panel";
  /** `siteUrl()`: base absoluta para el logo. */
  baseUrl: string;
  /** Piezas del cuerpo, ya armadas con las funciones de este módulo. */
  body: string;
}): string {
  const bodyPadding = audience === "cliente" ? "32px 24px 28px" : "28px 24px";
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${escapeHtml(subject)}</title>
<link href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background:${EMAIL_COLORS.page};">
<div style="display:none;max-height:0;max-width:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;color:${EMAIL_COLORS.page};">${escapeHtml(preheader)}${"&#8199;&#65279;&#847; ".repeat(40)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${EMAIL_COLORS.page}" style="background:${EMAIL_COLORS.page};">
<tr><td align="center" style="padding:24px 12px;">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${EMAIL_COLORS.card}" style="width:100%;max-width:600px;background:${EMAIL_COLORS.card};border:1px solid ${EMAIL_COLORS.cardBorder};">
${audience === "cliente" ? clientHeader(baseUrl) : panelHeader(baseUrl)}
<tr><td style="padding:${bodyPadding};font-family:${FONT};color:${EMAIL_COLORS.ink};">${body}</td></tr>
${footer(audience)}
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr>
</table>
</body>
</html>`;
}
