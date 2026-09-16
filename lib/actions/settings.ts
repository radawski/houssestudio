"use server";

import { revalidatePath } from "next/cache";

import {
  actionError,
  actionSuccess,
  validationError,
  type ActionState,
} from "@/lib/actions/result";
import { requireAdmin } from "@/lib/auth";
import { bookingWindowSchema } from "@/lib/validation/schemas";

/**
 * Guarda la ventana de reserva: desde cuanto antes y hasta cuanto despues se
 * puede pedir un turno.
 *
 * Cambiarla solo afecta a las reservas nuevas. Los turnos ya tomados mas alla
 * del nuevo tope siguen en pie: borrarlos por bajar un numero en el panel
 * seria destruir compromisos ya asumidos con clientes.
 */
export async function saveBookingWindow(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { supabase } = await requireAdmin();

  const parsed = bookingWindowSchema.safeParse({
    maxBookingDays: formData.get("maxBookingDays"),
    minLeadMinutes: formData.get("minLeadMinutes"),
  });

  if (!parsed.success) return validationError(parsed.error);

  const { error } = await supabase
    .from("settings")
    .update({
      max_booking_days: parsed.data.maxBookingDays,
      min_booking_lead_minutes: parsed.data.minLeadMinutes,
    })
    .eq("id", true);

  if (error) return actionError(`No se pudo guardar la configuracion: ${error.message}`);

  revalidatePath("/admin/disponibilidad");
  // La portada usa el limite para armar el calendario, asi que el cambio tiene
  // que verse ahi enseguida.
  revalidatePath("/");

  return actionSuccess("Ventana de reserva actualizada.");
}
