import { timingSafeEqual } from "node:crypto";

import { getSettings } from "@/lib/data/availability";
import { getReminderCandidates } from "@/lib/data/reminders";
import { sendReminder, type ReminderOutcome } from "@/lib/email/send";
import { pickReminders, tomorrowRange } from "@/lib/reminders";
import { manageUrlFor } from "@/lib/tokens";

/**
 * Recordatorio del día anterior (Fase 3, tasks/plan-recordatorios.md).
 *
 * La llama Vercel Cron una vez por día (`vercel.json`, 10 de la mañana de
 * Buenos Aires) con `Authorization: Bearer <CRON_SECRET>`, que Vercel agrega
 * solo cuando la variable existe. Sin ese encabezado responde 401: es una
 * dirección pública y manda mails.
 *
 * Responde un resumen para los logs de Vercel. Un envío fallido no frena a
 * los demás; volver a llamarla el mismo día no repite recordatorios.
 */

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }

  const range = tomorrowRange();
  const [candidates, settings] = await Promise.all([getReminderCandidates(range), getSettings()]);
  const { send, skipped } = pickReminders(candidates);

  const outcomes: Record<ReminderOutcome, number> = { enviado: 0, error: 0, duplicado: 0 };
  for (const appointment of send) {
    const outcome = await sendReminder({
      appointmentId: appointment.id,
      toEmail: appointment.email!,
      fullName: appointment.fullName,
      serviceName: appointment.serviceName,
      price: appointment.price,
      startsAt: appointment.startsAt,
      endsAt: appointment.endsAt,
      manageUrl: manageUrlFor(appointment.id, appointment.manageTokenHash),
      cancellationWindowHours: settings.cancellation_window_hours,
    });
    outcomes[outcome] += 1;
  }

  const summary = { fecha: range.dateKey, turnos: candidates.length, salteados: skipped, ...outcomes };
  console.log("Recordatorios:", JSON.stringify(summary));
  return Response.json(summary);
}
