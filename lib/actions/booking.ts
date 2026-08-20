"use server";

import { redirect } from "next/navigation";

import {
  actionError,
  validationError,
  type ActionState,
} from "@/lib/actions/result";
import { getActiveService, getAvailableSlots } from "@/lib/data/availability";
import { toDateKey } from "@/lib/dates";
import { formatTime } from "@/lib/format";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateManageToken } from "@/lib/tokens";
import { bookingSchema } from "@/lib/validation/schemas";

/** Código de Postgres para violación de restricción de exclusión. */
const EXCLUSION_VIOLATION = "23P01";

/** Horarios ofrecibles, para la grilla del portal público. */
export async function fetchSlots(
  serviceId: string,
  dateKey: string,
): Promise<{ startsAt: string; label: string }[]> {
  const slots = await getAvailableSlots(serviceId, dateKey);
  return slots.map((slot) => ({
    startsAt: slot.start.toISOString(),
    label: formatTime(slot.start),
  }));
}

/**
 * Crea la solicitud de turno en estado "pendiente".
 *
 * Hay tres controles encadenados, y ninguno sobra:
 *
 *  1. Zod valida la forma de los datos.
 *  2. Se recalcula la disponibilidad del lado del servidor y se exige que el
 *     horario pedido este entre los ofrecidos. Sin esto, cualquiera podria
 *     mandar un POST con las 3 de la manana o encima de un bloqueo.
 *  3. La restriccion de exclusion de la base resuelve la carrera entre dos
 *     personas que mandan el mismo horario en el mismo instante: el paso 2 no
 *     puede cubrirla porque entre leer y escribir hay una ventana.
 */
export async function createBooking(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = bookingSchema.safeParse({
    serviceId: formData.get("serviceId"),
    startsAt: formData.get("startsAt"),
    fullName: formData.get("fullName"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    note: formData.get("note") || undefined,
  });

  if (!parsed.success) return validationError(parsed.error);

  const { serviceId, startsAt, fullName, phone, email, note } = parsed.data;

  const service = await getActiveService(serviceId);
  if (!service) return actionError("Ese servicio ya no está disponible.");

  const startDate = new Date(startsAt);
  const slots = await getAvailableSlots(serviceId, toDateKey(startDate));
  const isOffered = slots.some((slot) => slot.start.getTime() === startDate.getTime());

  if (!isOffered) {
    return actionError("Ese horario ya no está disponible. Elegí otro, por favor.");
  }

  const endDate = new Date(startDate.getTime() + service.duration_minutes * 60_000);
  const supabase = createAdminClient();

  // El teléfono normalizado es la identidad del cliente: si ya vino antes, se
  // actualizan sus datos de contacto y el turno se suma a su historial.
  const { data: customer, error: customerError } = await supabase
    .from("customers")
    .upsert({ phone, full_name: fullName, email }, { onConflict: "phone" })
    .select("id")
    .single();

  if (customerError || !customer) {
    return actionError("No pudimos guardar tus datos. Intentá de nuevo.");
  }

  const { token, hash } = generateManageToken();

  const { error } = await supabase.from("appointments").insert({
    customer_id: customer.id,
    service_id: service.id,
    service_name_at_booking: service.name,
    price_at_booking: service.price,
    duration_minutes_at_booking: service.duration_minutes,
    starts_at: startDate.toISOString(),
    ends_at: endDate.toISOString(),
    manage_token_hash: hash,
    customer_note: note ?? null,
  });

  if (error) {
    if (error.code === EXCLUSION_VIOLATION) {
      return actionError("Ese horario acaba de ser tomado. Elegí otro, por favor.");
    }
    return actionError("No pudimos registrar tu turno. Intentá de nuevo.");
  }

  redirect(`/turno/${token}?nuevo=1`);
}
