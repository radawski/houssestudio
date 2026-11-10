import "server-only";

import { randomUUID } from "node:crypto";

import { businessTimeToDate, type Interval } from "@/lib/availability";
import { BLOCKING_STATUSES, fetchBusinessDays, toDayHours } from "@/lib/data/availability";
import { addDaysToKey, todayKey } from "@/lib/dates";
import {
  OCCURRENCES_AHEAD,
  occurrenceDates,
  occurrenceProblem,
  weekdayOfKey,
  type RecurrenceRule,
} from "@/lib/recurring";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { RecurringAppointment, Service } from "@/lib/supabase/database.types";
import { deriveManageToken, hashManageToken } from "@/lib/tokens";

/**
 * Turno fijo (plan de noviembre, T2): el generador y las lecturas.
 *
 * `fillRecurring` mantiene agendadas las próximas `OCCURRENCES_AHEAD` fechas
 * de cada regla activa. Lo llaman la tarea diaria (sin sesión, por eso usa la
 * service_role) y las acciones del panel después de crear o reanudar una
 * regla (ya pasaron por `requireAdmin`).
 *
 * Es idempotente: cada fecha se resuelve una sola vez. Si ya hay un turno de
 * la regla en ese horario (en cualquier estado, también cancelado) o ya se
 * registró un salto, no se toca. El índice único `(recurring_id, starts_at)`
 * cubre el caso de dos corridas a la vez.
 */

const EXCLUSION_VIOLATION = "23P01";
const UNIQUE_VIOLATION = "23505";

type RuleRow = RecurringAppointment & {
  service: Pick<Service, "id" | "name" | "price" | "duration_minutes" | "is_active"> | null;
};

export type FillResult = {
  agendados: number;
  salteados: { recurringId: string; date: string; reason: string }[];
};

export function toRule(row: Pick<RecurringAppointment, "anchor_date" | "every_weeks" | "monthly_nth">): RecurrenceRule {
  return { anchorDate: row.anchor_date, everyWeeks: row.every_weeks, monthlyNth: row.monthly_nth };
}

/** Las próximas fechas de la regla que todavía no pasaron, con su instante de inicio. */
function upcoming(row: RecurringAppointment, now: Date) {
  return occurrenceDates(toRule(row), todayKey(now), OCCURRENCES_AHEAD + 1)
    .map((date) => ({ date, start: businessTimeToDate(date, row.start_time) }))
    .filter((occurrence) => occurrence.start.getTime() > now.getTime())
    .slice(0, OCCURRENCES_AHEAD);
}

export async function fillRecurring({
  ids,
  now = new Date(),
}: { ids?: string[]; now?: Date } = {}): Promise<FillResult> {
  const supabase = createAdminClient();
  const result: FillResult = { agendados: 0, salteados: [] };

  let rulesQuery = supabase
    .from("recurring_appointments")
    .select("*, service:services(id, name, price, duration_minutes, is_active)")
    .eq("active", true)
    .is("ended_at", null);
  if (ids) rulesQuery = rulesQuery.in("id", ids);
  const { data: rulesData, error: rulesError } = await rulesQuery;
  if (rulesError) throw new Error(`No se pudieron leer los turnos fijos: ${rulesError.message}`);
  const rules = (rulesData ?? []) as unknown as RuleRow[];
  if (rules.length === 0) return result;

  const plans = rules.map((rule) => ({ rule, dates: upcoming(rule, now) }));
  const allDates = plans.flatMap((plan) => plan.dates.map((d) => d.date)).sort();
  if (allDates.length === 0) return result;

  // Una consulta por tipo para todas las reglas y todo el rango.
  const ruleIds = rules.map((rule) => rule.id);
  const rangeStart = businessTimeToDate(allDates[0], "00:00").toISOString();
  const rangeEnd = businessTimeToDate(addDaysToKey(allDates[allDates.length - 1], 2), "00:00").toISOString();

  const [existing, skips, blocks, busy, days] = await Promise.all([
    supabase
      .from("appointments")
      .select("recurring_id, starts_at")
      .in("recurring_id", ruleIds)
      .gte("starts_at", now.toISOString()),
    supabase
      .from("recurring_skips")
      .select("recurring_id, skipped_on")
      .in("recurring_id", ruleIds)
      .gte("skipped_on", todayKey(now)),
    supabase.from("time_blocks").select("starts_at, ends_at, reason").lt("starts_at", rangeEnd).gt("ends_at", rangeStart),
    supabase
      .from("appointments")
      .select("starts_at, ends_at")
      .in("status", [...BLOCKING_STATUSES])
      .lt("starts_at", rangeEnd)
      .gt("ends_at", rangeStart),
    fetchBusinessDays(supabase),
  ]);
  for (const query of [existing, skips, blocks, busy]) {
    if (query.error) throw new Error(`No se pudo preparar el turno fijo: ${query.error.message}`);
  }

  const done = new Set([
    ...(existing.data ?? []).map((row) => `${row.recurring_id}|${new Date(row.starts_at).getTime()}`),
  ]);
  const skipped = new Set((skips.data ?? []).map((row) => `${row.recurring_id}|${row.skipped_on}`));
  const blockList = (blocks.data ?? []).map((row) => ({
    start: new Date(row.starts_at),
    end: new Date(row.ends_at),
    reason: row.reason,
  }));
  // Los turnos que se van agendando acá se suman, para que dos reglas no
  // tomen el mismo horario en la misma corrida.
  const taken: Interval[] = (busy.data ?? []).map((row) => ({ start: new Date(row.starts_at), end: new Date(row.ends_at) }));

  async function skip(recurringId: string, date: string, reason: string) {
    const { error } = await supabase
      .from("recurring_skips")
      .upsert({ recurring_id: recurringId, skipped_on: date, reason }, {
        onConflict: "recurring_id,skipped_on",
        ignoreDuplicates: true,
      });
    if (error) throw new Error(`No se pudo registrar la fecha salteada: ${error.message}`);
    result.salteados.push({ recurringId, date, reason });
  }

  for (const { rule, dates } of plans) {
    for (const { date, start } of dates) {
      if (done.has(`${rule.id}|${start.getTime()}`) || skipped.has(`${rule.id}|${date}`)) continue;

      const service = rule.service;
      if (!service || !service.is_active) {
        await skip(rule.id, date, "El servicio ya no está disponible.");
        continue;
      }

      const slot = { start, end: new Date(start.getTime() + service.duration_minutes * 60_000) };
      const day = days.find((d) => d.weekday === weekdayOfKey(date));
      const problem = occurrenceProblem({
        dateKey: date,
        slot,
        hours: day ? toDayHours(day) : null,
        blocks: blockList,
        taken,
      });
      if (problem) {
        await skip(rule.id, date, problem);
        continue;
      }

      const id = randomUUID();
      const { error } = await supabase.from("appointments").insert({
        id,
        customer_id: rule.customer_id,
        service_id: service.id,
        service_name_at_booking: service.name,
        price_at_booking: service.price,
        duration_minutes_at_booking: service.duration_minutes,
        starts_at: slot.start.toISOString(),
        ends_at: slot.end.toISOString(),
        status: "confirmado",
        confirmed_at: new Date().toISOString(),
        manage_token_hash: hashManageToken(deriveManageToken(id)),
        recurring_id: rule.id,
      });

      if (error?.code === UNIQUE_VIOLATION) continue; // otra corrida lo agendó recién
      if (error?.code === EXCLUSION_VIOLATION) {
        await skip(rule.id, date, "Ya hay otro turno en ese horario.");
        continue;
      }
      if (error) throw new Error(`No se pudo agendar el turno fijo: ${error.message}`);

      taken.push(slot);
      result.agendados += 1;
    }
  }

  return result;
}

// --- Lecturas del panel (sesión del admin, con RLS) --------------------------

export type OpenSkip = {
  id: string;
  skippedOn: string;
  reason: string;
  recurringId: string;
  startTime: string;
  customer: { id: string; full_name: string } | null;
  serviceId: string | null;
};

/** Fechas salteadas sin resolver, de hoy en adelante, para el aviso de Hoy. */
export async function getOpenSkips(): Promise<OpenSkip[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("recurring_skips")
    .select(
      "id, skipped_on, reason, recurring_id, rule:recurring_appointments(start_time, service_id, customer:customers(id, full_name))",
    )
    .is("resolved_at", null)
    .gte("skipped_on", todayKey())
    .order("skipped_on");

  if (error) {
    // El aviso es de apoyo: si falla (o la migración 0017 todavía no está), Hoy se ve igual.
    console.error(`No se pudieron leer las fechas salteadas: ${error.message}`);
    return [];
  }

  type Row = {
    id: string;
    skipped_on: string;
    reason: string;
    recurring_id: string;
    rule: {
      start_time: string;
      service_id: string | null;
      customer: { id: string; full_name: string } | null;
    } | null;
  };
  return (data as unknown as Row[]).map((row) => ({
    id: row.id,
    skippedOn: row.skipped_on,
    reason: row.reason,
    recurringId: row.recurring_id,
    startTime: row.rule?.start_time ?? "00:00:00",
    customer: row.rule?.customer ?? null,
    serviceId: row.rule?.service_id ?? null,
  }));
}

export type CustomerRecurring = RecurringAppointment & {
  service: Pick<Service, "id" | "name"> | null;
  /** Próxima fecha agendada y la última, para "próximo 11/11 · agendado hasta 23/12". */
  nextAt: string | null;
  lastAt: string | null;
};

/** Turnos fijos de un cliente que no terminaron (activos o pausados), para su ficha. */
export async function getCustomerRecurring(customerId: string): Promise<CustomerRecurring[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("recurring_appointments")
    .select("*, service:services(id, name), appointments(starts_at, status)")
    .eq("customer_id", customerId)
    .is("ended_at", null)
    .order("created_at");

  if (error) {
    console.error(`No se pudieron leer los turnos fijos: ${error.message}`);
    return [];
  }

  type Row = RecurringAppointment & {
    service: Pick<Service, "id" | "name"> | null;
    appointments: { starts_at: string; status: string }[] | null;
  };
  const now = Date.now();
  return (data as unknown as Row[]).map(({ appointments, ...rule }) => {
    const upcomingStarts = (appointments ?? [])
      .filter((a) => (a.status === "confirmado" || a.status === "pendiente") && new Date(a.starts_at).getTime() > now)
      .map((a) => a.starts_at)
      .sort();
    return {
      ...rule,
      nextAt: upcomingStarts[0] ?? null,
      lastAt: upcomingStarts[upcomingStarts.length - 1] ?? null,
    };
  });
}
