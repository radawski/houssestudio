import "server-only";

import type { ReminderCandidate } from "@/lib/reminders";
import { createAdminClient } from "@/lib/supabase/admin";

export type ReminderAppointment = ReminderCandidate & {
  fullName: string;
  serviceName: string;
  price: number;
  startsAt: string;
  endsAt: string;
  manageTokenHash: string;
};

type Row = {
  id: string;
  status: string;
  service_name_at_booking: string;
  price_at_booking: number;
  starts_at: string;
  ends_at: string;
  manage_token_hash: string;
  customer: { full_name: string; email: string | null } | null;
};

/**
 * Turnos que empiezan dentro de `range` (el día de mañana), con su cliente y
 * si ya tienen un recordatorio enviado. Va con `service_role`: la tarea
 * programada no tiene sesión de admin. El filtro de quién recibe lo hace
 * `pickReminders`.
 */
export async function getReminderCandidates(range: { start: Date; end: Date }): Promise<ReminderAppointment[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("appointments")
    .select(
      "id, status, service_name_at_booking, price_at_booking, starts_at, ends_at, manage_token_hash, customer:customers(full_name, email)",
    )
    .gte("starts_at", range.start.toISOString())
    .lt("starts_at", range.end.toISOString())
    .order("starts_at");
  if (error) throw new Error(`No se pudieron leer los turnos de mañana: ${error.message}`);

  const rows = data as unknown as Row[];
  if (rows.length === 0) return [];

  const { data: sent, error: logError } = await supabase
    .from("email_log")
    .select("appointment_id")
    .eq("type", "recordatorio")
    .eq("status", "enviado")
    .in(
      "appointment_id",
      rows.map((row) => row.id),
    );
  if (logError) throw new Error(`No se pudieron leer los recordatorios enviados: ${logError.message}`);
  const reminded = new Set(sent.map((row) => row.appointment_id));

  return rows.map((row) => ({
    id: row.id,
    status: row.status,
    email: row.customer?.email ?? null,
    alreadyReminded: reminded.has(row.id),
    fullName: row.customer?.full_name ?? "",
    serviceName: row.service_name_at_booking,
    price: row.price_at_booking,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    manageTokenHash: row.manage_token_hash,
  }));
}
