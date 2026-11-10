import { timingSafeEqual } from "node:crypto";

import { revalidateAgenda } from "@/lib/cache";
import { pickComebacks } from "@/lib/comebacks";
import { runIsolated } from "@/lib/cron";
import { getSettings } from "@/lib/data/availability";
import { getComebackInputs } from "@/lib/data/comebacks";
import { fillRecurring } from "@/lib/data/recurring";
import { getReminderCandidates } from "@/lib/data/reminders";
import { todayKey } from "@/lib/dates";
import { sendComeback, sendReminder, type ReminderOutcome } from "@/lib/email/send";
import { pickReminders, tomorrowRange } from "@/lib/reminders";
import { manageUrlFor, unsubscribeUrlFor } from "@/lib/tokens";

/**
 * Tarea diaria de los recordatorios. La llama Vercel Cron una vez por día
 * (`vercel.json`, 10 de la mañana de Buenos Aires) con
 * `Authorization: Bearer <CRON_SECRET>`, que Vercel agrega solo cuando la
 * variable existe. Sin ese encabezado responde 401: es una dirección pública
 * y manda mails.
 *
 * Corre tres trabajos, cada uno aislado (`runIsolated`): si uno falla, los
 * otros corren igual.
 * - `turnosFijos`: completa las próximas 4 fechas de cada turno fijo (T2,
 *   tasks/plan-mejoras-noviembre.md). Va primero para que un turno fijo de
 *   mañana recién agendado también reciba su recordatorio.
 * - `recordatorios`: el del día anterior (Fase 3, tasks/plan-recordatorios.md).
 * - `vuelta`: "Ya pasó un mes" (Fase 4, tasks/plan-mejoras-octubre.md).
 *
 * Responde un resumen para los logs de Vercel. Un envío fallido no frena a
 * los demás; volver a llamarla el mismo día no repite ningún mail.
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

  const turnosFijos = await runIsolated("turnos-fijos", async () => {
    const { agendados, salteados } = await fillRecurring();
    // Turnos nuevos en la agenda: igual que cualquier otro alta de turno.
    if (agendados > 0) revalidateAgenda();
    return { agendados, salteados: salteados.length };
  });

  const recordatorios = await runIsolated("recordatorios", async () => {
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
    return { fecha: range.dateKey, turnos: candidates.length, salteados: skipped, ...outcomes };
  });

  const vuelta = await runIsolated("vuelta", async () => {
    const today = todayKey();
    const inputs = await getComebackInputs(today);
    const { send, skipped } = pickComebacks({ ...inputs, today });

    const outcomes: Record<ReminderOutcome, number> = { enviado: 0, error: 0, duplicado: 0 };
    for (const comeback of send) {
      const outcome = await sendComeback({
        appointmentId: comeback.appointmentId,
        toEmail: comeback.email,
        fullName: comeback.fullName,
        lastVisitAt: comeback.lastVisitAt,
        serviceName: comeback.serviceName,
        daysSince: comeback.daysSince,
        unsubscribeUrl: unsubscribeUrlFor(comeback.customerId),
      });
      outcomes[outcome] += 1;
    }
    return { clientes: send.length + skipped, salteados: skipped, ...outcomes };
  });

  const summary = { turnosFijos, recordatorios, vuelta };
  console.log("Recordatorios:", JSON.stringify(summary));
  return Response.json(summary);
}
