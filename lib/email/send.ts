import "server-only";

import { adminEmail, emailFrom } from "@/lib/email/env";
import { getResendClient } from "@/lib/email/resend";
import {
  buildAppointmentConfirmedEmail,
  buildBookingConfirmationEmail,
  buildCancellationAdminEmail,
  buildCancellationClientEmail,
  buildNewRequestAlertEmail,
  buildReminderEmail,
  type CancellationData,
  type ConfirmedData,
} from "@/lib/email/templates";
import { createAdminClient } from "@/lib/supabase/admin";
import type { EmailType } from "@/lib/supabase/database.types";

/**
 * Envío de los emails transaccionales, en HTML (design/Emails.dc.html) y con
 * su versión en texto plano para los clientes que no muestran HTML.
 *
 * Ninguna de estas funciones lanza: un fallo de Resend, o de la propia
 * escritura en `email_log`, queda registrado (o, para los avisos internos,
 * solo en el log del server) pero nunca interrumpe la reserva o la
 * cancelación que lo dispara.
 */

async function logEmail(entry: {
  appointment_id: string;
  type: EmailType;
  to_email: string;
  status: "enviado" | "error";
  provider_id?: string | null;
  error?: string | null;
}) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("email_log").insert(entry);
  if (error) {
    console.error(`No se pudo registrar el email en email_log: ${error.message}`);
  }
}

function messageFrom(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function sendBookingConfirmation(params: {
  appointmentId: string;
  toEmail: string | null;
  fullName: string;
  serviceName: string;
  startsAt: string;
  endsAt: string;
  price: number;
  manageUrl: string;
}): Promise<void> {
  if (!params.toEmail) return;

  const { subject, html, text } = buildBookingConfirmationEmail(params);

  try {
    const { data, error } = await getResendClient().emails.send({
      from: emailFrom(),
      to: params.toEmail,
      subject,
      html,
      text,
    });
    if (error) throw new Error(error.message);

    await logEmail({
      appointment_id: params.appointmentId,
      type: "confirmacion",
      to_email: params.toEmail,
      status: "enviado",
      provider_id: data?.id ?? null,
    });
  } catch (error) {
    console.error(`No se pudo enviar la confirmación de turno: ${messageFrom(error)}`);
    await logEmail({
      appointment_id: params.appointmentId,
      type: "confirmacion",
      to_email: params.toEmail,
      status: "error",
      error: messageFrom(error),
    });
  }
}

/**
 * 1b: el peluquero aceptó el turno. Se registra en `email_log` como
 * `aceptacion` (migración 0011). Si esa migración todavía no se aplicó, el
 * mail sale igual y solo falla el registro, que ya se informa por consola.
 */
export async function sendAppointmentConfirmed(
  params: ConfirmedData & { appointmentId: string; toEmail: string | null },
): Promise<void> {
  if (!params.toEmail) return;

  const { subject, html, text } = buildAppointmentConfirmedEmail(params);

  try {
    const { data, error } = await getResendClient().emails.send({
      from: emailFrom(),
      to: params.toEmail,
      subject,
      html,
      text,
    });
    if (error) throw new Error(error.message);

    await logEmail({
      appointment_id: params.appointmentId,
      type: "aceptacion",
      to_email: params.toEmail,
      status: "enviado",
      provider_id: data?.id ?? null,
    });
  } catch (error) {
    console.error(`No se pudo enviar el aviso de turno confirmado: ${messageFrom(error)}`);
    await logEmail({
      appointment_id: params.appointmentId,
      type: "aceptacion",
      to_email: params.toEmail,
      status: "error",
      error: messageFrom(error),
    });
  }
}

/** Postgres: violación de índice único. */
const UNIQUE_VIOLATION = "23505";

export type ReminderOutcome = "enviado" | "error" | "duplicado";

/**
 * Recordatorio del día anterior (Fase 3). A diferencia de los otros envíos,
 * primero reserva su fila en `email_log` como `enviado` y recién después
 * manda: el índice único `email_log_reminder_once_idx` admite un solo
 * recordatorio enviado por turno, así que si la tarea corriera dos veces a la
 * vez la segunda choca ahí y no manda nada. Si el envío falla, la fila pasa
 * a `error` (y deja de bloquear un reintento).
 */
export async function sendReminder(
  params: ConfirmedData & { appointmentId: string; toEmail: string },
): Promise<ReminderOutcome> {
  const supabase = createAdminClient();
  const { data: claim, error: claimError } = await supabase
    .from("email_log")
    .insert({
      appointment_id: params.appointmentId,
      type: "recordatorio",
      to_email: params.toEmail,
      status: "enviado",
    })
    .select("id")
    .single();

  if (claimError) {
    if (claimError.code === UNIQUE_VIOLATION) return "duplicado";
    console.error(`No se pudo registrar el recordatorio: ${claimError.message}`);
    return "error";
  }

  const { subject, html, text } = buildReminderEmail(params);
  try {
    const { data, error } = await getResendClient().emails.send({
      from: emailFrom(),
      to: params.toEmail,
      subject,
      html,
      text,
    });
    if (error) throw new Error(error.message);
    await supabase.from("email_log").update({ provider_id: data?.id ?? null }).eq("id", claim.id);
    return "enviado";
  } catch (error) {
    console.error(`No se pudo enviar el recordatorio: ${messageFrom(error)}`);
    await supabase
      .from("email_log")
      .update({ status: "error", error: messageFrom(error) })
      .eq("id", claim.id);
    return "error";
  }
}

/**
 * Aviso interno, no comunicación con el cliente: no se registra en
 * `email_log` (esa tabla es la auditoría de lo que recibe el cliente, y su
 * índice de idempotencia es específico para recordatorios).
 */
export async function sendNewRequestAlert(params: {
  fullName: string;
  phone: string;
  serviceName: string;
  startsAt: string;
  endsAt: string;
  price: number;
}): Promise<void> {
  const { subject, html, text } = buildNewRequestAlertEmail(params);

  try {
    const { error } = await getResendClient().emails.send({
      from: emailFrom(),
      to: adminEmail(),
      subject,
      html,
      text,
    });
    if (error) throw new Error(error.message);
  } catch (error) {
    console.error(`No se pudo enviar el aviso de solicitud nueva: ${messageFrom(error)}`);
  }
}

export async function sendCancellationNotice(
  params: CancellationData & { appointmentId: string; toEmail: string | null },
): Promise<void> {
  if (params.toEmail) {
    const { subject, html, text } = buildCancellationClientEmail(params);
    try {
      const { data, error } = await getResendClient().emails.send({
        from: emailFrom(),
        to: params.toEmail,
        subject,
        html,
        text,
      });
      if (error) throw new Error(error.message);

      await logEmail({
        appointment_id: params.appointmentId,
        type: "cancelacion",
        to_email: params.toEmail,
        status: "enviado",
        provider_id: data?.id ?? null,
      });
    } catch (error) {
      console.error(`No se pudo enviar la notificación de cancelación: ${messageFrom(error)}`);
      await logEmail({
        appointment_id: params.appointmentId,
        type: "cancelacion",
        to_email: params.toEmail,
        status: "error",
        error: messageFrom(error),
      });
    }
  }

  const { subject, html, text } = buildCancellationAdminEmail(params);
  try {
    const { error } = await getResendClient().emails.send({
      from: emailFrom(),
      to: adminEmail(),
      subject,
      html,
      text,
    });
    if (error) throw new Error(error.message);
  } catch (error) {
    console.error(`No se pudo enviar el aviso interno de cancelación: ${messageFrom(error)}`);
  }
}
