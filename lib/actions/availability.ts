"use server";

import { revalidatePath } from "next/cache";

import {
  actionError,
  actionSuccess,
  validationError,
  type ActionState,
} from "@/lib/actions/result";
import { businessTimeToDate } from "@/lib/availability";
import { requireAdmin } from "@/lib/auth";
import { BLOCKING_STATUSES } from "@/lib/data/availability";
import { formatTime } from "@/lib/format";
import { businessHourSchema, timeBlockSchema } from "@/lib/validation/schemas";

function revalidateAvailability() {
  revalidatePath("/admin/disponibilidad");
  revalidatePath("/admin/agenda");
  revalidatePath("/reservar");
}

const WEEKDAY_NAMES = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

/**
 * Guarda los siete dias de una sola vez.
 *
 * El horario semanal se lee y se decide como una unidad ("cierro los lunes,
 * sabado corto"), asi que guardarlo entero evita estados intermedios raros como
 * quedar cerrado toda la semana mientras se edita dia por dia. La escritura va
 * por `save_business_hours`, una sola transaccion para los siete dias y sus
 * bloques.
 *
 * Cada bloque llega como un par `opens-<dia>`/`closes-<dia>` repetido;
 * `getAll` los devuelve en el orden del formulario, asi que el indice sirve
 * para nombrar el bloque con error ("Lunes, bloque 2").
 */
export async function saveBusinessHours(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { supabase } = await requireAdmin();

  const days = [];
  for (let weekday = 0; weekday < 7; weekday++) {
    const opens = formData.getAll(`opens-${weekday}`).map(String);
    const closes = formData.getAll(`closes-${weekday}`).map(String);

    const parsed = businessHourSchema.safeParse({
      weekday,
      isClosed: formData.get(`closed-${weekday}`) === "on",
      ranges: opens.map((opensAt, index) => ({ opensAt, closesAt: closes[index] ?? "" })),
    });

    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const blockIndex = issue.path[1];
      const where =
        typeof blockIndex === "number"
          ? `${WEEKDAY_NAMES[weekday]}, bloque ${blockIndex + 1}`
          : WEEKDAY_NAMES[weekday];
      return actionError(`${where}: ${issue.message}.`);
    }

    days.push({
      weekday: parsed.data.weekday,
      is_closed: parsed.data.isClosed,
      ranges: parsed.data.ranges.map((range) => ({
        opens_at: range.opensAt,
        closes_at: range.closesAt,
      })),
    });
  }

  const { error } = await supabase.rpc("save_business_hours", { p_days: days });
  if (error) return actionError(`No se pudieron guardar los horarios: ${error.message}`);

  revalidateAvailability();
  return actionSuccess("Horarios actualizados.");
}

export async function createTimeBlock(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { supabase } = await requireAdmin();

  const parsed = timeBlockSchema.safeParse({
    date: formData.get("date"),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
    reason: formData.get("reason") || undefined,
  });

  if (!parsed.success) return validationError(parsed.error);

  const startsAt = businessTimeToDate(parsed.data.date, parsed.data.startTime);
  const endsAt = businessTimeToDate(parsed.data.date, parsed.data.endTime);

  // Un bloqueo encima de un turno vivo dejaria la agenda mintiendo: el horario
  // desapareceria del portal publico pero el cliente seguiria esperando ser
  // atendido. Se avisa para que primero se resuelva el turno.
  const { data: conflicts, error: conflictError } = await supabase
    .from("appointments")
    .select("starts_at, ends_at")
    .in("status", [...BLOCKING_STATUSES])
    .lt("starts_at", endsAt.toISOString())
    .gt("ends_at", startsAt.toISOString())
    .order("starts_at");

  if (conflictError) {
    return actionError(`No se pudo verificar la agenda: ${conflictError.message}`);
  }

  if (conflicts.length > 0) {
    const list = conflicts.map((c) => formatTime(c.starts_at)).join(", ");
    return actionError(
      `Ese rango pisa ${conflicts.length} turno(s) activo(s) (${list}). Cancelalos primero o achicá el bloqueo.`,
    );
  }

  const { error } = await supabase.from("time_blocks").insert({
    starts_at: startsAt.toISOString(),
    ends_at: endsAt.toISOString(),
    reason: parsed.data.reason ?? null,
  });

  if (error) return actionError(`No se pudo crear el bloqueo: ${error.message}`);

  revalidateAvailability();
  return actionSuccess("Bloqueo creado.");
}

export async function deleteTimeBlock(id: string) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("time_blocks").delete().eq("id", id);

  if (error) throw new Error(`No se pudo eliminar el bloqueo: ${error.message}`);
  revalidateAvailability();
}
