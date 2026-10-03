import "server-only";

import { COMEBACK_MAX_DAYS, type ComebackCustomer, type CompletedVisit } from "@/lib/comebacks";
import { addDaysToKey, dayRange } from "@/lib/dates";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Lo que necesita `pickComebacks` para decidir a quién escribirle hoy. Va con
 * `service_role`: la tarea programada no tiene sesión de admin.
 *
 * Trae los turnos completados desde hace `COMEBACK_MAX_DAYS` días hasta ahora,
 * no solo los que caen en la ventana: para saber cuál es la ÚLTIMA visita de
 * cada cliente hay que ver también las más recientes.
 */
export async function getComebackInputs(today: string, now: Date = new Date()) {
  const supabase = createAdminClient();
  const since = dayRange(addDaysToKey(today, -COMEBACK_MAX_DAYS)).start.toISOString();

  const { data: visitRows, error } = await supabase
    .from("appointments")
    .select("id, customer_id, starts_at, service_name_at_booking")
    .eq("status", "completado")
    .gte("starts_at", since)
    .lt("starts_at", now.toISOString());
  if (error) throw new Error(`No se pudieron leer las visitas: ${error.message}`);

  const visits: CompletedVisit[] = visitRows.map((row) => ({
    id: row.id,
    customerId: row.customer_id,
    startsAt: row.starts_at,
    serviceName: row.service_name_at_booking,
  }));
  const customerIds = [...new Set(visits.map((visit) => visit.customerId))];
  if (customerIds.length === 0) {
    return { visits, customers: new Map<string, ComebackCustomer>(), upcoming: new Set<string>(), alreadySent: new Set<string>() };
  }

  const [customersResult, upcomingResult, sentResult] = await Promise.all([
    supabase.from("customers").select("id, full_name, email, comeback_opt_out_at").in("id", customerIds),
    supabase
      .from("appointments")
      .select("customer_id")
      .in("customer_id", customerIds)
      .in("status", ["pendiente", "confirmado"])
      .gte("starts_at", now.toISOString()),
    supabase
      .from("email_log")
      .select("appointment_id")
      .eq("type", "vuelta")
      .eq("status", "enviado")
      .in(
        "appointment_id",
        visits.map((visit) => visit.id),
      ),
  ]);
  if (customersResult.error) throw new Error(`No se pudieron leer los clientes: ${customersResult.error.message}`);
  if (upcomingResult.error) throw new Error(`No se pudieron leer los turnos próximos: ${upcomingResult.error.message}`);
  if (sentResult.error) throw new Error(`No se pudieron leer los envíos: ${sentResult.error.message}`);

  return {
    visits,
    customers: new Map<string, ComebackCustomer>(
      customersResult.data.map((row) => [
        row.id,
        { id: row.id, fullName: row.full_name, email: row.email, optedOut: row.comeback_opt_out_at !== null },
      ]),
    ),
    upcoming: new Set(upcomingResult.data.map((row) => row.customer_id)),
    alreadySent: new Set(sentResult.data.map((row) => row.appointment_id).filter((id): id is string => id !== null)),
  };
}
