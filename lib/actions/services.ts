"use server";

import { revalidatePath } from "next/cache";

import {
  actionError,
  actionSuccess,
  validationError,
  type ActionState,
} from "@/lib/actions/result";
import { requireAdmin } from "@/lib/auth";
import { serviceSchema } from "@/lib/validation/schemas";

function revalidateServices() {
  revalidatePath("/admin/servicios");
  revalidatePath("/reservar");
}

export async function saveService(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { supabase } = await requireAdmin();

  const parsed = serviceSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    price: formData.get("price"),
    durationMinutes: formData.get("durationMinutes"),
    isActive: formData.get("isActive") === "on",
  });

  if (!parsed.success) return validationError(parsed.error);

  const id = formData.get("id");
  const values = {
    name: parsed.data.name,
    description: parsed.data.description ?? null,
    price: parsed.data.price,
    duration_minutes: parsed.data.durationMinutes,
    is_active: parsed.data.isActive,
  };

  const { error } =
    typeof id === "string" && id
      ? await supabase.from("services").update(values).eq("id", id)
      : await supabase.from("services").insert(values);

  if (error) return actionError(`No se pudo guardar el servicio: ${error.message}`);

  revalidateServices();
  return actionSuccess(id ? "Servicio actualizado." : "Servicio creado.");
}

/** Alterna la visibilidad en el portal publico sin borrar el servicio. */
export async function toggleServiceActive(id: string, isActive: boolean) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase
    .from("services")
    .update({ is_active: isActive })
    .eq("id", id);

  if (error) throw new Error(`No se pudo actualizar el servicio: ${error.message}`);
  revalidateServices();
}

/**
 * Borra un servicio del catalogo.
 *
 * Los turnos ya tomados no se pierden ni se corrompen: la FK es
 * `on delete set null` y cada turno guarda nombre, precio y duracion propios,
 * asi que el historico y los reportes siguen siendo correctos.
 */
export async function deleteService(id: string) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("services").delete().eq("id", id);

  if (error) throw new Error(`No se pudo eliminar el servicio: ${error.message}`);
  revalidateServices();
}
