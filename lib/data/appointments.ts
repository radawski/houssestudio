import "server-only";

import { dayRange } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import type { Appointment, Customer } from "@/lib/supabase/database.types";

/**
 * Lecturas del panel privado.
 *
 * A diferencia de `lib/data/availability.ts` (que sirve al portal publico y usa
 * la service_role), estas consultas van por el cliente ligado a la sesion: RLS
 * queda como segunda barrera, de modo que un bug de autorizacion en la capa de
 * rutas no alcance para exponer datos.
 */

export type AppointmentWithCustomer = Appointment & {
  customer: Pick<Customer, "id" | "full_name" | "phone" | "email"> | null;
};

const WITH_CUSTOMER = "*, customer:customers(id, full_name, phone, email)";

export async function countPendingAppointments(): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("appointments")
    .select("id", { count: "exact", head: true })
    .eq("status", "pendiente");
  return count ?? 0;
}

/** Solicitudes sin resolver, las mas proximas primero. */
export async function getPendingAppointments(): Promise<AppointmentWithCustomer[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("appointments")
    .select(WITH_CUSTOMER)
    .eq("status", "pendiente")
    .order("starts_at", { ascending: true });

  if (error) throw new Error(`No se pudieron leer las solicitudes: ${error.message}`);
  return (data ?? []) as unknown as AppointmentWithCustomer[];
}

/** Turnos que arrancan dentro de un rango absoluto de tiempo. */
export async function getAppointmentsBetween(
  start: Date,
  end: Date,
): Promise<AppointmentWithCustomer[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("appointments")
    .select(WITH_CUSTOMER)
    .gte("starts_at", start.toISOString())
    .lt("starts_at", end.toISOString())
    .order("starts_at", { ascending: true });

  if (error) throw new Error(`No se pudieron leer los turnos: ${error.message}`);
  return (data ?? []) as unknown as AppointmentWithCustomer[];
}

export async function getAppointmentsForDay(
  dateKey: string,
): Promise<AppointmentWithCustomer[]> {
  const { start, end } = dayRange(dateKey);
  return getAppointmentsBetween(start, end);
}

export async function getAppointmentById(
  id: string,
): Promise<AppointmentWithCustomer | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("appointments")
    .select(WITH_CUSTOMER)
    .eq("id", id)
    .maybeSingle();
  return (data as unknown as AppointmentWithCustomer) ?? null;
}
