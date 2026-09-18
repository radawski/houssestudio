import { BUSINESS_NAME } from "@/lib/config";
import { formatCurrency, formatDateTime } from "@/lib/format";

/**
 * Contenido de los emails transaccionales — funciones puras, sin red ni
 * base, para poder testearlas igual que `lib/availability.ts`.
 */

export type EmailContent = { subject: string; text: string };

export function buildBookingConfirmationEmail(data: {
  fullName: string;
  serviceName: string;
  startsAt: string;
  price: number;
  manageUrl: string;
}): EmailContent {
  return {
    subject: `Recibimos tu solicitud de turno — ${BUSINESS_NAME}`,
    text: [
      `Hola ${data.fullName},`,
      "",
      `Recibimos tu solicitud para ${data.serviceName} el ${formatDateTime(data.startsAt)} h, por ${formatCurrency(data.price)}.`,
      "Te vamos a escribir por acá en cuanto quede confirmada.",
      "",
      `Seguí tu turno en: ${data.manageUrl}`,
    ].join("\n"),
  };
}

export function buildNewRequestAlertEmail(data: {
  fullName: string;
  phone: string;
  serviceName: string;
  startsAt: string;
  price: number;
}): EmailContent {
  return {
    subject: `Nueva solicitud — ${data.serviceName}`,
    text: [
      `${data.fullName} (${data.phone}) pidió un turno.`,
      "",
      `Servicio: ${data.serviceName}`,
      `Fecha: ${formatDateTime(data.startsAt)} h`,
      `Precio: ${formatCurrency(data.price)}`,
    ].join("\n"),
  };
}

export type CancellationData = {
  fullName: string;
  serviceName: string;
  startsAt: string;
  reason: string | null;
  cancelledBy: "cliente" | "barbero";
};

export function buildCancellationClientEmail(data: CancellationData): EmailContent {
  return {
    subject: `Turno cancelado — ${BUSINESS_NAME}`,
    text: [
      `Hola ${data.fullName},`,
      "",
      `Tu turno de ${data.serviceName} del ${formatDateTime(data.startsAt)} h fue cancelado.`,
      ...(data.reason ? ["", `Motivo: ${data.reason}`] : []),
    ].join("\n"),
  };
}

export function buildCancellationAdminEmail(data: CancellationData): EmailContent {
  const quien = data.cancelledBy === "cliente" ? "el cliente canceló" : "cancelaste";
  return {
    subject: `Turno cancelado — ${data.serviceName}`,
    text: [
      `${data.fullName}: ${quien} el turno de ${data.serviceName} del ${formatDateTime(data.startsAt)} h.`,
      ...(data.reason ? ["", `Motivo: ${data.reason}`] : []),
    ].join("\n"),
  };
}
