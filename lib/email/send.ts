import "server-only";

import { adminEmail, emailFrom } from "@/lib/email/env";
import { getResendClient } from "@/lib/email/resend";
import {
  buildBookingConfirmationEmail,
  buildCancellationAdminEmail,
  buildCancellationClientEmail,
  buildNewRequestAlertEmail,
  type CancellationData,
} from "@/lib/email/templates";
import { createAdminClient } from "@/lib/supabase/admin";
import type { EmailType } from "@/lib/supabase/database.types";

/**
 * Envío de los tres emails transaccionales de Fase 2.
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
  price: number;
  manageUrl: string;
}): Promise<void> {
  if (!params.toEmail) return;

  const { subject, text } = buildBookingConfirmationEmail(params);

  try {
    const { data, error } = await getResendClient().emails.send({
      from: emailFrom(),
      to: params.toEmail,
      subject,
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
 * Aviso interno, no comunicación con el cliente: no se registra en
 * `email_log` (esa tabla es la auditoría de lo que recibe el cliente, y su
 * índice de idempotencia es específico para recordatorios).
 */
export async function sendNewRequestAlert(params: {
  fullName: string;
  phone: string;
  serviceName: string;
  startsAt: string;
  price: number;
}): Promise<void> {
  const { subject, text } = buildNewRequestAlertEmail(params);

  try {
    const { error } = await getResendClient().emails.send({
      from: emailFrom(),
      to: adminEmail(),
      subject,
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
    const { subject, text } = buildCancellationClientEmail(params);
    try {
      const { data, error } = await getResendClient().emails.send({
        from: emailFrom(),
        to: params.toEmail,
        subject,
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

  const { subject, text } = buildCancellationAdminEmail(params);
  try {
    const { error } = await getResendClient().emails.send({
      from: emailFrom(),
      to: adminEmail(),
      subject,
      text,
    });
    if (error) throw new Error(error.message);
  } catch (error) {
    console.error(`No se pudo enviar el aviso interno de cancelación: ${messageFrom(error)}`);
  }
}
