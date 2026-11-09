import "server-only";

import { cookies } from "next/headers";

import { formatCurrency, formatLongDate, formatTime } from "@/lib/format";
import { firstName, splitMyAppointments } from "@/lib/my-appointments";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AppointmentStatus } from "@/lib/supabase/database.types";
import { deriveManageToken, manageTokenMatches, readMyAppointmentsSession } from "@/lib/tokens";

export type MyAppointment = {
  id: string;
  date: string;
  time: string;
  service: string;
  price: string;
  status: AppointmentStatus;
  /** `/turno/<token>`, o `null` para turnos anteriores a los tokens derivados. */
  href: string | null;
};

export type MyAppointmentsList = {
  name: string;
  upcoming: MyAppointment[];
  past: MyAppointment[];
};

/** Cookie de la sesión corta de "Mis turnos" (ver `createMyAppointmentsSession`). */
export const MY_APPOINTMENTS_COOKIE = "mis_turnos";

/** El cliente de la sesión de "Mis turnos" de este navegador, si sigue vigente. */
export async function getMyAppointmentsCustomerId(): Promise<string | null> {
  const store = await cookies();
  try {
    return readMyAppointmentsSession(store.get(MY_APPOINTMENTS_COOKIE)?.value);
  } catch {
    // Sin MANAGE_TOKEN_SECRET no hay sesión posible: se pide DNI + teléfono.
    return null;
  }
}

/**
 * Los turnos de un cliente, listos para mostrar: próximos y los últimos
 * anteriores, cada uno con el link a su página. `null` si el cliente ya no
 * existe o la consulta falla.
 */
export async function loadMyAppointments(customerId: string): Promise<MyAppointmentsList | null> {
  const supabase = createAdminClient();

  const [{ data: customer }, { data: rows, error }] = await Promise.all([
    supabase.from("customers").select("full_name").eq("id", customerId).maybeSingle(),
    supabase
      .from("appointments")
      .select("id, starts_at, ends_at, status, service_name_at_booking, price_at_booking, manage_token_hash")
      .eq("customer_id", customerId)
      .order("starts_at", { ascending: false })
      .limit(50),
  ]);

  if (!customer || error) return null;

  const toItem = (row: NonNullable<typeof rows>[number]): MyAppointment => ({
    id: row.id,
    date: formatLongDate(row.starts_at),
    time: `${formatTime(row.starts_at)} – ${formatTime(row.ends_at)}`,
    service: row.service_name_at_booking,
    price: formatCurrency(row.price_at_booking),
    status: row.status,
    href: manageTokenMatches(row.id, row.manage_token_hash) ? `/turno/${deriveManageToken(row.id)}` : null,
  });

  const { upcoming, past } = splitMyAppointments(rows ?? []);
  return { name: firstName(customer.full_name), upcoming: upcoming.map(toItem), past: past.map(toItem) };
}
