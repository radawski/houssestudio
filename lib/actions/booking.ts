"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import {
  actionError,
  actionSuccess,
  validationError,
  type ActionState,
} from "@/lib/actions/result";
import { revalidateAgenda } from "@/lib/cache";
import { canCancel } from "@/lib/cancellation";
import { siteUrl } from "@/lib/config";
import {
  getActiveService,
  getAvailableSlots,
  getMonthSlotCounts,
  getSettings,
} from "@/lib/data/availability";
import { getAppointmentByToken } from "@/lib/data/public";
import { toDateKey } from "@/lib/dates";
import { sendBookingConfirmation, sendCancellationNotice, sendNewRequestAlert } from "@/lib/email/send";
import { formatTime } from "@/lib/format";
import { isLocalPhone } from "@/lib/phone";
import { checkRateLimit } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateManageToken, hashManageToken } from "@/lib/tokens";
import { bookingSchema, cancelByTokenSchema, identifySchema } from "@/lib/validation/schemas";

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

/** `yyyy-MM`, el mes que pinta el calendario. */
const MONTH_KEY = /^\d{4}-(0[1-9]|1[0-2])$/;

/**
 * Cupos libres por dia del mes, para los puntos del calendario.
 *
 * Devuelve un objeto vacio ante un mes mal formado en lugar de reventar: el
 * parametro viene del navegador y una fecha basura no puede tumbar el paso de
 * la reserva.
 */
export async function fetchMonthAvailability(
  serviceId: string,
  monthKey: string,
): Promise<Record<string, number>> {
  if (!MONTH_KEY.test(monthKey)) return {};
  return getMonthSlotCounts(serviceId, monthKey);
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
 * Hay cinco controles encadenados, y ninguno sobra:
 *
 *  1. Zod valida la forma de los datos.
 *  2. Se recalcula la disponibilidad del lado del servidor y se exige que el
 *     horario pedido este entre los ofrecidos. Sin esto, cualquiera podria
 *     mandar un POST con las 3 de la manana o encima de un bloqueo.
 *  3. El DNI se resuelve contra la base en este mismo request, nunca contra un
 *     "ya existe" que mande el cliente: confiar en esa senal permitiria
 *     inyectar el customer_id de otra persona.
 *  4. El telefono tiene que caer dentro del area de atencion. Solo se exige
 *     cuando entra un telefono nuevo (alta o edicion): a un cliente ya
 *     registrado que no toca sus datos no se le revisa nada.
 *  5. La restriccion de exclusion de la base resuelve la carrera entre dos
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
    .select("id, full_name, phone, email")
    .eq("dni", dni)
    .maybeSingle();

  // Si el DNI ya tiene ficha y no llegaron datos de contacto, el cliente no
  // tocó "Editar mis datos": se reutiliza la ficha tal cual, sin escribir
  // nada. Si llegó alguno, se trata como alta o edición y se exigen los tres,
  // sea porque el DNI es nuevo o porque el cliente corrigió sus datos.
  const isEditingOrNew = !existingCustomer || Boolean(fullName || phone || email);

  let customerId: string;
  /** Para los emails transaccionales: siempre la ficha vigente tras esta operación. */
  let contact: { fullName: string; phone: string; email: string | null };

  if (!isEditingOrNew) {
    customerId = existingCustomer.id;
    contact = {
      fullName: existingCustomer.full_name,
      phone: existingCustomer.phone,
      email: existingCustomer.email,
    };
  } else {
    const missing: Record<string, string> = {};
    if (!fullName) missing.fullName = "Ingresa tu nombre completo";
    if (!phone) missing.phone = "Ingresa tu teléfono";
    if (!email) missing.email = "Ingresa tu email";

    if (Object.keys(missing).length > 0) {
      return actionError("Revisá tus datos de contacto.", missing);
    }

    // Se controla acá y no solo en el navegador porque el navegador es
    // manipulable: sin esta barrera alcanzaría con un POST a mano para tomar
    // el horario igual. Se corta ANTES de insertar, así el slot queda libre
    // para alguien que sí pueda venir.
    if (!isLocalPhone(phone!)) {
      return {
        status: "error",
        code: "fuera_de_area",
        message:
          "Para números fuera del área local, la reserva debe coordinarse directamente con el local.",
      };
    }

    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .upsert(
        { dni, full_name: fullName!, phone: phone!, email: email! },
        { onConflict: "dni" },
      )
      .select("id, full_name, phone, email")
      .single();

    if (customerError || !customer) {
      return actionError("No pudimos guardar tus datos. Intentá de nuevo.");
    }
    customerId = customer.id;
    contact = { fullName: customer.full_name, phone: customer.phone, email: customer.email };
  }

  const { token, hash } = generateManageToken();

  const { data: appointment, error } = await supabase
    .from("appointments")
    .insert({
      customer_id: customerId,
      service_id: service.id,
      service_name_at_booking: service.name,
      price_at_booking: service.price,
      duration_minutes_at_booking: service.duration_minutes,
      starts_at: startDate.toISOString(),
      ends_at: endDate.toISOString(),
      manage_token_hash: hash,
      customer_note: note ?? null,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === EXCLUSION_VIOLATION) {
      return actionError("Ese horario acaba de ser tomado. Elegí otro, por favor.");
    }
    return actionError("No pudimos registrar tu turno. Intentá de nuevo.");
  }

  // Nunca lanzan: un fallo de envío no puede tumbar una reserva ya guardada.
  await Promise.all([
    sendBookingConfirmation({
      appointmentId: appointment.id,
      toEmail: contact.email,
      fullName: contact.fullName,
      serviceName: service.name,
      startsAt: startDate.toISOString(),
      price: service.price,
      manageUrl: `${siteUrl()}/turno/${token}`,
    }),
    sendNewRequestAlert({
      fullName: contact.fullName,
      phone: contact.phone,
      serviceName: service.name,
      startsAt: startDate.toISOString(),
      price: service.price,
    }),
  ]);

  redirect(`/turno/${token}?nuevo=1`);
}

/**
 * Igual que `AppointmentWithCustomer` en `lib/data/appointments.ts`: los
 * tipos de `database.types.ts` no declaran relaciones, así que el embed
 * `customer:customers(...)` necesita un cast.
 */
type CancelledByTokenAppointment = {
  id: string;
  service_name_at_booking: string;
  starts_at: string;
  cancellation_reason: string | null;
  customer: { full_name: string; email: string | null } | null;
};

/**
 * Cancela un turno por su cuenta el propio cliente, desde `/turno/[token]`.
 *
 * El token nunca llega como id de turno: se resuelve por
 * `manage_token_hash` dentro del mismo `UPDATE` que aplica el cambio, y ese
 * `UPDATE` lleva también el estado cancelable y el límite de la ventana
 * (`.gt("starts_at", ...)`). No hay un chequeo previo separado: igual que la
 * restricción de exclusión resuelve la carrera de `createBooking`, hacerlo
 * todo en una sola sentencia es lo único que cierra la ventana entre leer y
 * escribir. Un login o un número de turno no alcanzan como filtro porque acá
 * no hay sesión: el hash del token es la única prueba de que quien pide la
 * baja es quien recibió el link.
 */
export async function cancelByToken(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = cancelByTokenSchema.safeParse({
    token: formData.get("token"),
    reason: formData.get("reason") || undefined,
  });
  if (!parsed.success) return validationError(parsed.error);

  const { token, reason } = parsed.data;

  const ip = await getClientIp();
  if (!checkRateLimit(`cancel-token:${ip}`, { limit: 10, windowMs: 60_000 })) {
    return actionError("Demasiados intentos. Esperá un momento y volvé a probar.");
  }

  const settings = await getSettings();
  // Cancelable solo si el turno empieza despues de este instante: es la
  // misma cuenta que `cancellationDeadline`, mirada desde el otro lado (la
  // hora minima de inicio en vez del limite de cancelacion).
  const earliestCancelableStart = new Date(
    Date.now() + settings.cancellation_window_hours * 60 * 60 * 1000,
  );

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("appointments")
    .update({
      status: "cancelado",
      cancelled_at: new Date().toISOString(),
      cancelled_by: "cliente",
      cancellation_reason: reason?.trim() || null,
    })
    .eq("manage_token_hash", hashManageToken(token))
    .in("status", ["pendiente", "confirmado"])
    .gt("starts_at", earliestCancelableStart.toISOString())
    .select(
      "id, service_name_at_booking, starts_at, cancellation_reason, customer:customers(full_name, email)",
    )
    .maybeSingle();

  if (error) return actionError("No pudimos cancelar tu turno. Intentá de nuevo.");

  if (!data) {
    // El UPDATE no afectó ninguna fila: el token no existe, el turno ya no
    // está en un estado cancelable, o el plazo venció entre que se abrió la
    // página y se confirmó. Se reconsulta solo para elegir el mensaje
    // correcto — nunca para decidir si cancelar, eso ya lo resolvió el
    // UPDATE de arriba.
    const current = await getAppointmentByToken(token);
    if (!current) return actionError("No encontramos tu turno.");

    if (!canCancel({ status: current.status, startsAt: current.starts_at, windowHours: settings.cancellation_window_hours })) {
      if (current.status !== "pendiente" && current.status !== "confirmado") {
        return actionError("Este turno ya no se puede cancelar desde acá.");
      }
      return {
        status: "error",
        code: "fuera_de_ventana",
        message:
          "Ya estás dentro del plazo mínimo para cancelar por tu cuenta. Coordiná el cambio directamente con el local.",
      };
    }

    // Cancelable según la relectura pero el UPDATE no encontró fila: carrera
    // perdida contra otro pedido concurrente (poco probable, pero no es un
    // error de la persona que cancela).
    return actionError("No pudimos cancelar tu turno. Volvé a intentar.");
  }

  const appointment = data as unknown as CancelledByTokenAppointment;

  revalidateAgenda();

  // Nunca lanza: un fallo de envío no puede tumbar una cancelación ya guardada.
  if (appointment.customer) {
    await sendCancellationNotice({
      appointmentId: appointment.id,
      toEmail: appointment.customer.email,
      fullName: appointment.customer.full_name,
      serviceName: appointment.service_name_at_booking,
      startsAt: appointment.starts_at,
      reason: appointment.cancellation_reason,
      cancelledBy: "cliente",
    });
  }

  return actionSuccess("Turno cancelado.");
}
