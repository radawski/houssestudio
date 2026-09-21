import "server-only";

import { weekdayOf, type DayHours, type Interval } from "@/lib/availability";
import { dayRange } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import type { Appointment, Customer, Payment, Service } from "@/lib/supabase/database.types";

/**
 * Lecturas del panel privado.
 *
 * A diferencia de `lib/data/availability.ts` (que sirve al portal publico y usa
 * la service_role), estas consultas van por el cliente ligado a la sesion: RLS
 * queda como segunda barrera, de modo que un bug de autorizacion en la capa de
 * rutas no alcance para exponer datos.
 */

export type AppointmentWithCustomer = Appointment & {
  customer: Pick<Customer, "id" | "dni" | "full_name" | "phone" | "email"> | null;
  /**
   * El cobro asociado, si lo hay. Se trae en la misma consulta (no una por
   * turno) para que la ficha del turno (design/admin-iphone n-SheetTurno)
   * pueda mostrar "Cobrado $X · Efectivo · hora" sin un viaje aparte a la
   * base — `payments.appointment_id` es único, así que el embed devuelve un
   * solo objeto, no un arreglo.
   */
  payment: Pick<Payment, "amount" | "method" | "paid_at"> | null;
};

const WITH_CUSTOMER =
  "*, customer:customers(id, dni, full_name, phone, email), payment:payments(amount, method, paid_at)";

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

/** Catálogo activo, para el selector de venta suelta. */
export async function getActiveServices(): Promise<Pick<Service, "id" | "name" | "price">[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("services")
    .select("id, name, price")
    .eq("is_active", true)
    .order("sort_order")
    .order("name");

  if (error) throw new Error(`No se pudieron leer los servicios: ${error.message}`);
  return data;
}

/**
 * Horario comercial de un dia, para la vista de agenda del dia (huecos
 * libres). A diferencia de `lib/data/availability.ts` (portal publico,
 * service_role), esta va por el cliente ligado a la sesion — mismo criterio
 * que el resto de este archivo.
 */
export async function getBusinessHoursForDay(dateKey: string): Promise<DayHours | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("business_hours")
    .select("*")
    .eq("weekday", weekdayOf(dateKey))
    .maybeSingle();

  if (error) throw new Error(`No se pudieron leer los horarios: ${error.message}`);
  if (!data) return null;

  return {
    isClosed: data.is_closed,
    opensAt: data.opens_at,
    closesAt: data.closes_at,
    secondRange:
      data.opens_at_2 && data.closes_at_2
        ? { opensAt: data.opens_at_2, closesAt: data.closes_at_2 }
        : null,
  };
}

/** Bloqueos manuales del dia, para restarlos de los huecos libres de la agenda. */
export async function getTimeBlocksForDay(dateKey: string): Promise<Interval[]> {
  const supabase = await createClient();
  const { start, end } = dayRange(dateKey);
  const { data, error } = await supabase
    .from("time_blocks")
    .select("starts_at, ends_at")
    .lt("starts_at", end.toISOString())
    .gt("ends_at", start.toISOString());

  if (error) throw new Error(`No se pudieron leer los bloqueos: ${error.message}`);
  return (data ?? []).map((row) => ({ start: new Date(row.starts_at), end: new Date(row.ends_at) }));
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
