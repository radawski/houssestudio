import "server-only";

import { compareCustomers, summarizeCustomer, type CustomerSummary } from "@/lib/customer-summary";
import type { AppointmentWithCustomer } from "@/lib/data/appointments";
import { createClient } from "@/lib/supabase/server";
import type { AppointmentStatus, Customer, Payment } from "@/lib/supabase/database.types";

/**
 * Lecturas de Clientes (Más → Clientes). Van por el cliente ligado a la
 * sesión, como el resto del panel: RLS queda como segunda barrera.
 */

export type CustomerListItem = Pick<Customer, "id" | "dni" | "full_name" | "phone"> & {
  summary: CustomerSummary;
};

type CustomerWithAppointments = Pick<Customer, "id" | "dni" | "full_name" | "phone"> & {
  appointments: { status: AppointmentStatus; starts_at: string }[] | null;
};

/**
 * Todos los clientes con su resumen, los que vinieron hace menos primero.
 *
 * Trae la lista entera (un estudio tiene cientos de clientes, no miles): así
 * el buscador filtra en el celular al instante, sin ir a la base por cada
 * letra.
 */
export async function getCustomerList(): Promise<CustomerListItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .select("id, dni, full_name, phone, appointments(status, starts_at)")
    .limit(2000);

  if (error) throw new Error(`No se pudieron leer los clientes: ${error.message}`);

  const now = new Date();
  return ((data ?? []) as unknown as CustomerWithAppointments[])
    .map(({ appointments, ...customer }) => ({
      ...customer,
      summary: summarizeCustomer(appointments ?? [], now),
    }))
    .sort(compareCustomers);
}

export type CustomerHistoryItem = Omit<AppointmentWithCustomer, "customer" | "payment"> & {
  payment: Pick<Payment, "amount" | "method" | "paid_at"> | null;
};

export type CustomerDetail = {
  customer: Customer;
  summary: CustomerSummary;
  /** Todos sus turnos, el más reciente primero. */
  appointments: CustomerHistoryItem[];
};

/** La ficha de un cliente, o `null` si no existe. */
export async function getCustomerDetail(id: string): Promise<CustomerDetail | null> {
  const supabase = await createClient();
  const [{ data: customer, error: customerError }, { data: rows, error }] = await Promise.all([
    supabase.from("customers").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("appointments")
      .select("*, payment:payments(amount, method, paid_at)")
      .eq("customer_id", id)
      .order("starts_at", { ascending: false }),
  ]);

  if (customerError) throw new Error(`No se pudo leer el cliente: ${customerError.message}`);
  if (!customer) return null;
  if (error) throw new Error(`No se pudieron leer los turnos del cliente: ${error.message}`);

  const appointments = (rows ?? []) as unknown as CustomerHistoryItem[];
  return {
    customer,
    summary: summarizeCustomer(
      appointments.map((a) => ({ status: a.status, starts_at: a.starts_at, paid: a.payment?.amount ?? 0 })),
    ),
    appointments,
  };
}
