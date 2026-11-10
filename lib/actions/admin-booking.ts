"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import { after } from "next/server";

import { revalidateAgenda } from "@/lib/cache";
import { requireAdmin } from "@/lib/auth";
import { compareCustomers, summarizeCustomer } from "@/lib/customer-summary";
import { getActiveService, getAvailableSlots, getSettings } from "@/lib/data/availability";
import { fillRecurring } from "@/lib/data/recurring";
import { toDateKey } from "@/lib/dates";
import { sendAppointmentConfirmed } from "@/lib/email/send";
import { formatLongDate, formatTime } from "@/lib/format";
import { describeFrequency, listDates, ruleFromChoice, type RepeatChoice } from "@/lib/recurring";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AppointmentStatus } from "@/lib/supabase/database.types";
import { deriveManageToken, hashManageToken, manageUrlFor } from "@/lib/tokens";
import { customerSchema } from "@/lib/validation/schemas";

/** Código de Postgres para violación de restricción de exclusión (turnos superpuestos). */
const EXCLUSION_VIOLATION = "23P01";

export type CustomerOption = {
  id: string;
  dni: string;
  full_name: string;
  phone: string;
  noShows: number;
};

export type ServiceOption = { id: string; name: string; price: number; duration_minutes: number };

/**
 * Lo que necesita la hoja "Nuevo turno" al abrirse: los clientes (para el
 * buscador, que filtra en el celular) y los servicios activos. Se pide al
 * abrir la hoja y no con cada carga de la Agenda.
 */
export async function getNewAppointmentOptions(): Promise<{
  customers: CustomerOption[];
  services: ServiceOption[];
}> {
  const { supabase } = await requireAdmin();

  const [customersResult, servicesResult] = await Promise.all([
    supabase.from("customers").select("id, dni, full_name, phone, appointments(status, starts_at)").limit(2000),
    supabase
      .from("services")
      .select("id, name, price, duration_minutes")
      .eq("is_active", true)
      .order("sort_order")
      .order("name"),
  ]);

  if (customersResult.error) throw new Error(`No se pudieron leer los clientes: ${customersResult.error.message}`);
  if (servicesResult.error) throw new Error(`No se pudieron leer los servicios: ${servicesResult.error.message}`);

  type Row = CustomerOption & { appointments: { status: AppointmentStatus; starts_at: string }[] | null };
  const customers = (customersResult.data as unknown as Row[])
    .map(({ appointments, ...customer }) => ({ ...customer, summary: summarizeCustomer(appointments ?? []) }))
    .sort(compareCustomers)
    .map(({ summary, ...customer }) => ({ ...customer, noShows: summary.noShows }));

  return { customers, services: servicesResult.data };
}

/**
 * Horarios libres de un día para el turno manual: la misma grilla que ve el
 * cliente en la reserva (decisión del usuario: solo horarios de la grilla),
 * sin el límite de días ni la anticipación mínima de la reserva online.
 */
export async function fetchAdminSlots(
  serviceId: string,
  dateKey: string,
): Promise<{ startsAt: string; label: string }[]> {
  await requireAdmin();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return [];
  const slots = await getAvailableSlots(serviceId, dateKey, new Date(), { ignoreBookingWindow: true });
  return slots.map((slot) => ({ startsAt: slot.start.toISOString(), label: formatTime(slot.start) }));
}

export type AdminBookingResult =
  | { status: "success"; message: string; appointmentId: string }
  | { status: "error"; message: string; fieldErrors?: Record<string, string> };

/**
 * Agenda un turno desde el panel (plan de noviembre, T1): para un cliente
 * existente o uno nuevo, en un horario de la grilla. Queda **confirmado**
 * directamente y, si el cliente tiene email, le llega la confirmación de
 * siempre con el link a su turno.
 *
 * Igual que la reserva online, el horario se vuelve a validar acá (tiene que
 * estar entre los ofrecidos) y la restricción de la base resuelve la carrera
 * de dos turnos en el mismo instante.
 *
 * Con `repeat` (T2) además arma el turno fijo: la regla, este primer turno
 * ligado a ella y las fechas siguientes hasta completar 4. Las que no entran
 * se saltean y quedan en el aviso de Hoy.
 */
export async function createAdminAppointment(input: {
  customerId?: string;
  newCustomer?: { dni: string; fullName: string; phone: string; email?: string };
  serviceId: string;
  startsAt: string;
  repeat?: RepeatChoice;
  /** Fecha salteada de un turno fijo que este turno reemplaza (aviso de Hoy). */
  resolvesSkipId?: string;
}): Promise<AdminBookingResult> {
  const { supabase } = await requireAdmin();

  // --- Cliente ---------------------------------------------------------------
  let customer: { id: string; full_name: string; email: string | null } | null = null;

  if (input.newCustomer) {
    const parsed = customerSchema.safeParse({
      ...input.newCustomer,
      email: input.newCustomer.email || undefined,
    });
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "");
        if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      return { status: "error", message: "Revisá los datos del cliente.", fieldErrors };
    }

    const { dni, fullName, phone, email } = parsed.data;
    const { data: existing } = await supabase
      .from("customers")
      .select("id, full_name, email")
      .eq("dni", dni)
      .maybeSingle();

    if (existing) {
      // Ese DNI ya tenía ficha: se usa la que hay, sin pisar sus datos.
      customer = existing;
    } else {
      const { data: created, error } = await supabase
        .from("customers")
        .insert({ dni, full_name: fullName, phone, email: email ?? null })
        .select("id, full_name, email")
        .single();
      if (error || !created) return { status: "error", message: "No se pudo guardar el cliente nuevo." };
      customer = created;
    }
  } else if (input.customerId) {
    const { data } = await supabase
      .from("customers")
      .select("id, full_name, email")
      .eq("id", input.customerId)
      .maybeSingle();
    customer = data;
  }

  if (!customer) return { status: "error", message: "Elegí un cliente." };

  // --- Servicio y horario -----------------------------------------------------
  const service = await getActiveService(input.serviceId);
  if (!service) return { status: "error", message: "Ese servicio ya no está disponible." };

  const startDate = new Date(input.startsAt);
  if (Number.isNaN(startDate.getTime())) return { status: "error", message: "Elegí un horario." };

  const offered = await getAvailableSlots(service.id, toDateKey(startDate), new Date(), {
    ignoreBookingWindow: true,
  });
  if (!offered.some((slot) => slot.start.getTime() === startDate.getTime())) {
    return { status: "error", message: "Ese horario ya no está libre. Elegí otro." };
  }

  const endDate = new Date(startDate.getTime() + service.duration_minutes * 60_000);

  // --- Turno fijo (opcional) --------------------------------------------------
  // La regla va primero porque el turno se guarda ligado a ella. Se escribe
  // con la service_role, igual que el generador (ya pasó `requireAdmin`).
  const dateKey = toDateKey(startDate);
  const rule = ruleFromChoice(input.repeat ?? "no", dateKey);
  let recurringId: string | null = null;
  if (rule) {
    const { data: created, error } = await createAdminClient()
      .from("recurring_appointments")
      .insert({
        customer_id: customer.id,
        service_id: service.id,
        anchor_date: dateKey,
        start_time: formatTime(startDate),
        every_weeks: rule.everyWeeks,
        monthly_nth: rule.monthlyNth,
      })
      .select("id")
      .single();
    if (error || !created) return { status: "error", message: "No se pudo guardar el turno fijo." };
    recurringId = created.id;
  }

  // --- Turno ----------------------------------------------------------------
  // El id se genera acá porque el token del link se deriva de él, igual que
  // en la reserva online.
  const appointmentId = randomUUID();
  const token = deriveManageToken(appointmentId);
  const manageTokenHash = hashManageToken(token);

  const { error } = await supabase.from("appointments").insert({
    id: appointmentId,
    customer_id: customer.id,
    service_id: service.id,
    service_name_at_booking: service.name,
    price_at_booking: service.price,
    duration_minutes_at_booking: service.duration_minutes,
    starts_at: startDate.toISOString(),
    ends_at: endDate.toISOString(),
    status: "confirmado",
    confirmed_at: new Date().toISOString(),
    manage_token_hash: manageTokenHash,
    // Solo con turno fijo: así el turno suelto no depende de la migración 0017.
    ...(recurringId ? { recurring_id: recurringId } : {}),
  });

  if (error) {
    // Sin primer turno no hay turno fijo: la regla recién creada se borra.
    if (recurringId) await createAdminClient().from("recurring_appointments").delete().eq("id", recurringId);
    if (error.code === EXCLUSION_VIOLATION) {
      return { status: "error", message: "Ese horario acaba de ser tomado. Elegí otro." };
    }
    return { status: "error", message: `No se pudo agendar el turno: ${error.message}` };
  }

  if (input.resolvesSkipId) {
    await supabase
      .from("recurring_skips")
      .update({ resolved_at: new Date().toISOString() })
      .eq("id", input.resolvesSkipId);
  }

  // Las fechas siguientes del turno fijo. Si algo falla acá, el primer turno
  // ya quedó y la tarea diaria completa el resto.
  let skippedNote = "";
  if (recurringId) {
    try {
      const filled = await fillRecurring({ ids: [recurringId] });
      if (filled.salteados.length > 0) {
        skippedNote = ` No se pudo agendar el ${listDates(filled.salteados.map((s) => s.date))}: quedó el aviso en Hoy.`;
      }
    } catch (fillError) {
      console.error("No se pudieron agendar las fechas siguientes del turno fijo:", fillError);
      skippedNote = " Las fechas siguientes se agendan solas mañana.";
    }
  }

  revalidateAgenda();
  revalidatePath(`/admin/clientes/${customer.id}`);

  // El mail sale después de responder y nunca lanza (queda en `email_log`).
  const email = customer.email;
  const fullName = customer.full_name;
  if (email) {
    after(async () => {
      const settings = await getSettings();
      await sendAppointmentConfirmed({
        appointmentId,
        toEmail: email,
        fullName,
        serviceName: service.name,
        price: service.price,
        startsAt: startDate.toISOString(),
        endsAt: endDate.toISOString(),
        manageUrl: manageUrlFor(appointmentId, manageTokenHash),
        cancellationWindowHours: settings.cancellation_window_hours,
      });
    });
  }

  return {
    status: "success",
    appointmentId,
    message: rule
      ? `Turno fijo agendado · ${fullName}, ${describeFrequency(rule).toLowerCase()} desde el ${formatLongDate(startDate)} ${formatTime(startDate)}.${skippedNote}`
      : `Turno agendado · ${fullName}, ${formatLongDate(startDate)} ${formatTime(startDate)}.`,
  };
}
