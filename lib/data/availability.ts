import "server-only";

import { computeSlots, weekdayOf, type Interval } from "@/lib/availability";
import { BUSINESS_TIMEZONE } from "@/lib/config";
import { createAdminClient } from "@/lib/supabase/admin";
import type { BusinessHour, Service, Settings } from "@/lib/supabase/database.types";

/** Estados que ocupan la agenda. Los demas liberan el slot automaticamente. */
export const BLOCKING_STATUSES = ["pendiente", "confirmado"] as const;

/** Limites absolutos de un dia local del local, con margen para franjas que lo cruzan. */
function dayBounds(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  // Se toma un dia entero de margen a cada lado: asi entran los bloqueos o
  // turnos que empiezan la vispera y terminan dentro del dia consultado.
  const start = new Date(Date.UTC(year, month - 1, day - 1));
  const end = new Date(Date.UTC(year, month - 1, day + 2));
  return { start: start.toISOString(), end: end.toISOString() };
}

export async function getSettings(): Promise<Settings> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("settings").select("*").single();
  if (error) throw new Error(`No se pudo leer la configuracion: ${error.message}`);
  return data;
}

export async function getBusinessHours(): Promise<BusinessHour[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("business_hours")
    .select("*")
    .order("weekday");
  if (error) throw new Error(`No se pudieron leer los horarios: ${error.message}`);
  return data;
}

/** Franjas ocupadas dentro de un rango absoluto: bloqueos mas turnos vivos. */
async function getBusyBetween(start: string, end: string): Promise<Interval[]> {
  const supabase = createAdminClient();

  const [blocks, appointments] = await Promise.all([
    supabase
      .from("time_blocks")
      .select("starts_at, ends_at")
      .lt("starts_at", end)
      .gt("ends_at", start),
    supabase
      .from("appointments")
      .select("starts_at, ends_at")
      .in("status", [...BLOCKING_STATUSES])
      .lt("starts_at", end)
      .gt("ends_at", start),
  ]);

  if (blocks.error) throw new Error(`No se pudieron leer los bloqueos: ${blocks.error.message}`);
  if (appointments.error) {
    throw new Error(`No se pudieron leer los turnos: ${appointments.error.message}`);
  }

  return [...blocks.data, ...appointments.data].map((row) => ({
    start: new Date(row.starts_at),
    end: new Date(row.ends_at),
  }));
}

/** Franjas ocupadas del dia: bloqueos manuales mas turnos que ocupan agenda. */
export async function getBusyIntervals(dateKey: string): Promise<Interval[]> {
  const { start, end } = dayBounds(dateKey);
  return getBusyBetween(start, end);
}

export async function getActiveService(serviceId: string): Promise<Service | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("services")
    .select("*")
    .eq("id", serviceId)
    .eq("is_active", true)
    .maybeSingle();
  return data;
}

/**
 * Horarios ofrecibles para un servicio en un dia.
 *
 * Es la unica fuente de verdad de disponibilidad del portal publico: tanto la
 * grilla que ve el cliente como la revalidacion previa a confirmar la reserva
 * pasan por aca, de modo que no puedan discrepar.
 */
export async function getAvailableSlots(
  serviceId: string,
  dateKey: string,
  now: Date = new Date(),
): Promise<Interval[]> {
  const service = await getActiveService(serviceId);
  if (!service) return [];

  const [hours, busy, settings] = await Promise.all([
    getBusinessHours(),
    getBusyIntervals(dateKey),
    getSettings(),
  ]);

  const dayHours = hours.find((h) => h.weekday === weekdayOf(dateKey, BUSINESS_TIMEZONE));

  return computeSlots({
    dateKey,
    durationMinutes: service.duration_minutes,
    hours: dayHours
      ? {
          isClosed: dayHours.is_closed,
          opensAt: dayHours.opens_at,
          closesAt: dayHours.closes_at,
        }
      : null,
    busy,
    now,
    minLeadMinutes: settings.min_booking_lead_minutes,
  });
}

/**
 * Cupos libres por cada dia de un mes, para los puntos del calendario.
 *
 * Hace una sola consulta de ocupacion para el mes entero y despues calcula cada
 * dia en memoria con el mismo `computeSlots` que usa la reserva. Resolverlo dia
 * por dia serian treinta y pico de viajes a la base cada vez que alguien pasa
 * de mes, y ademas abriria la puerta a que el calendario y la grilla de
 * horarios discrepen.
 */
export async function getMonthSlotCounts(
  serviceId: string,
  monthKey: string,
  now: Date = new Date(),
): Promise<Record<string, number>> {
  const service = await getActiveService(serviceId);
  if (!service) return {};

  const [year, month] = monthKey.split("-").map(Number);
  // El dia 0 del mes siguiente es el ultimo del pedido.
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

  // Un dia de margen a cada lado, por las franjas que cruzan la medianoche.
  const rangeStart = new Date(Date.UTC(year, month - 1, 0)).toISOString();
  const rangeEnd = new Date(Date.UTC(year, month - 1, daysInMonth + 2)).toISOString();

  const [hours, busy, settings] = await Promise.all([
    getBusinessHours(),
    getBusyBetween(rangeStart, rangeEnd),
    getSettings(),
  ]);

  const counts: Record<string, number> = {};

  for (let day = 1; day <= daysInMonth; day++) {
    const dateKey = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const dayHours = hours.find((h) => h.weekday === weekdayOf(dateKey, BUSINESS_TIMEZONE));

    counts[dateKey] = computeSlots({
      dateKey,
      durationMinutes: service.duration_minutes,
      hours: dayHours
        ? {
            isClosed: dayHours.is_closed,
            opensAt: dayHours.opens_at,
            closesAt: dayHours.closes_at,
          }
        : null,
      busy,
      now,
      minLeadMinutes: settings.min_booking_lead_minutes,
    }).length;
  }

  return counts;
}
