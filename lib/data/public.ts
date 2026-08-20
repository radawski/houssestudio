import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { hashManageToken } from "@/lib/tokens";
import type { Appointment, Customer } from "@/lib/supabase/database.types";

export type PublicAppointment = Appointment & {
  customer: Pick<Customer, "full_name" | "phone" | "email"> | null;
};

/**
 * Resuelve un turno a partir del token que recibio el cliente.
 *
 * La consulta va por hash: el token en claro nunca toca la base. Devolver
 * `null` ante un token inexistente es deliberado — no se distingue "no existe"
 * de "no es tuyo", asi que no hay forma de sondear turnos ajenos.
 */
export async function getAppointmentByToken(
  token: string,
): Promise<PublicAppointment | null> {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from("appointments")
    .select("*, customer:customers(full_name, phone, email)")
    .eq("manage_token_hash", hashManageToken(token))
    .maybeSingle();

  return (data as unknown as PublicAppointment) ?? null;
}
