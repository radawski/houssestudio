"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import {
  actionError,
  validationError,
  type ActionState,
} from "@/lib/actions/result";
import { getActiveService, getAvailableSlots } from "@/lib/data/availability";
import { toDateKey } from "@/lib/dates";
import { formatTime } from "@/lib/format";
import { checkRateLimit } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateManageToken } from "@/lib/tokens";
import { bookingSchema, identifySchema } from "@/lib/validation/schemas";

/** Código de Postgres para violación de restricción de exclusión. */
const EXCLUSION_VIOLATION = "23P01";

/**
 * IP del visitante, para el límite de intentos.
 *
 * En Vercel el tráfico llega detrás de un proxy: la IP real viaja en
 * `x-forwarded-for` (primer valor de la lista) y no en la conexión TCP.
 */
async function getClientIp(): Promise<string> {
  const store = await headers();
  const forwarded = store.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "desconocida";
}

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

export type CustomerLookupResult =
  | { status: "found"; fullName: string; phone: string; email: string | null }
  | { status: "not_found" }
  | { status: "error"; message: string };

/**
 * Reconoce a un cliente por DNI para la divulgación progresiva del paso 3.
 *
 * Limitada a 20 intentos por minuto por IP: es una consulta pública sin
 * fricción (un solo campo, sin captcha), y sin este límite serviría para
 * barrer documentos y recolectar nombres, teléfonos y mails ajenos.
 */
export async function lookupCustomerByDni(rawDni: string): Promise<CustomerLookupResult> {
  const parsed = identifySchema.safeParse({ dni: rawDni });
  if (!parsed.success) return { status: "not_found" };

  const ip = await getClientIp();
  if (!checkRateLimit(`dni-lookup:${ip}`, { limit: 20, windowMs: 60_000 })) {
    return {
      status: "error",
      message: "Demasiados intentos. Esperá un momento y volvé a probar.",
    };
  }

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("customers")
    .select("full_name, phone, email")
    .eq("dni", parsed.data.dni)
    .maybeSingle();

  if (!data) return { status: "not_found" };

  return { status: "found", fullName: data.full_name, phone: data.phone, email: data.email };
}

/**
 * Crea la solicitud de turno en estado "pendiente".
 *
 * Hay cuatro controles encadenados, y ninguno sobra:
 *
 *  1. Zod valida la forma de los datos.
 *  2. Se recalcula la disponibilidad del lado del servidor y se exige que el
 *     horario pedido este entre los ofrecidos. Sin esto, cualquiera podria
 *     mandar un POST con las 3 de la manana o encima de un bloqueo.
 *  3. El DNI se resuelve contra la base en este mismo request, nunca contra un
 *     "ya existe" que mande el cliente: confiar en esa senal permitiria
 *     inyectar el customer_id de otra persona.
 *  4. La restriccion de exclusion de la base resuelve la carrera entre dos
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
    dni: formData.get("dni"),
    fullName: formData.get("fullName") || undefined,
    phone: formData.get("phone") || undefined,
    email: formData.get("email") || undefined,
    note: formData.get("note") || undefined,
  });

  if (!parsed.success) return validationError(parsed.error);

  const { serviceId, startsAt, dni, fullName, phone, email, note } = parsed.data;

  const ip = await getClientIp();
  if (!checkRateLimit(`booking:${ip}`, { limit: 10, windowMs: 60_000 })) {
    return actionError("Demasiados intentos. Esperá un momento y volvé a probar.");
  }

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

  const { data: existingCustomer } = await supabase
    .from("customers")
    .select("id")
    .eq("dni", dni)
    .maybeSingle();

  // Si el DNI ya tiene ficha y no llegaron datos de contacto, el cliente no
  // tocó "Editar mis datos": se reutiliza la ficha tal cual, sin escribir
  // nada. Si llegó alguno, se trata como alta o edición y se exigen los tres,
  // sea porque el DNI es nuevo o porque el cliente corrigió sus datos.
  const isEditingOrNew = !existingCustomer || Boolean(fullName || phone || email);

  let customerId: string;

  if (!isEditingOrNew) {
    customerId = existingCustomer.id;
  } else {
    const missing: Record<string, string> = {};
    if (!fullName) missing.fullName = "Ingresa tu nombre completo";
    if (!phone) missing.phone = "Ingresa tu teléfono";
    if (!email) missing.email = "Ingresa tu email";

    if (Object.keys(missing).length > 0) {
      return actionError("Revisá tus datos de contacto.", missing);
    }

    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .upsert(
        { dni, full_name: fullName!, phone: phone!, email: email! },
        { onConflict: "dni" },
      )
      .select("id")
      .single();

    if (customerError || !customer) {
      return actionError("No pudimos guardar tus datos. Intentá de nuevo.");
    }
    customerId = customer.id;
  }

  const { token, hash } = generateManageToken();

  const { error } = await supabase.from("appointments").insert({
    customer_id: customerId,
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
