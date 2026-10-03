"use server";

import {
  actionError,
  actionSuccess,
  validationError,
  type ActionState,
} from "@/lib/actions/result";
import { requireAdmin } from "@/lib/auth";
import { customerSchema } from "@/lib/validation/schemas";

/**
 * Alta de un cliente desde el panel (Más → Agregar cliente).
 *
 * Es la salida para quien tiene una línea de otra zona: la reserva web lo
 * frena y lo manda a coordinar por WhatsApp; el peluquero le carga la ficha
 * con estos datos y desde ahí el cliente reserva solo con su DNI (la reserva
 * no revisa la zona del teléfono que ya figura en su ficha, ver
 * `isBookablePhone`).
 *
 * Si el DNI ya tiene ficha, la actualiza en vez de duplicarla. Un email vacío
 * no borra el que ya tenía: dejarlo en blanco acá es "no lo sé", no "sacalo".
 */
export async function addCustomer(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase } = await requireAdmin();

  const parsed = customerSchema.safeParse({
    dni: formData.get("dni"),
    fullName: formData.get("fullName"),
    phone: formData.get("phone"),
    email: formData.get("email") || undefined,
  });

  if (!parsed.success) return validationError(parsed.error);

  const { dni, fullName, phone, email } = parsed.data;

  const { data: existing, error: lookupError } = await supabase
    .from("customers")
    .select("id")
    .eq("dni", dni)
    .maybeSingle();

  if (lookupError) return actionError(`No se pudo guardar el cliente: ${lookupError.message}`);

  const values = { full_name: fullName, phone, ...(email ? { email } : {}) };

  const { error } = existing
    ? await supabase.from("customers").update(values).eq("id", existing.id)
    : await supabase.from("customers").insert({ dni, ...values });

  if (error) return actionError(`No se pudo guardar el cliente: ${error.message}`);

  return actionSuccess(
    existing
      ? `Ese DNI ya tenía ficha: actualizamos los datos de ${fullName}.`
      : `${fullName} ya puede reservar desde la web con su DNI.`,
  );
}
