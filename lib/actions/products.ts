"use server";

import { revalidatePath } from "next/cache";

import {
  actionError,
  actionSuccess,
  validationError,
  type ActionState,
} from "@/lib/actions/result";
import { requireAdmin } from "@/lib/auth";
import { productCategorySchema, productSchema } from "@/lib/validation/schemas";

/**
 * Catálogo de productos (Más › Productos): categorías y productos.
 *
 * Todas devuelven `ActionState` en vez de lanzar: un nombre repetido o una
 * categoría con productos son errores esperables que la pantalla muestra tal
 * cual, y en producción Next ocultaría el mensaje de un error lanzado.
 */

/** Postgres: violación de índice único (nombre repetido). */
const UNIQUE_VIOLATION = "23505";
/** Postgres: violación de clave foránea (borrar una categoría con productos). */
const FOREIGN_KEY_VIOLATION = "23503";

function revalidateProducts() {
  revalidatePath("/admin/productos");
  revalidatePath("/admin/caja");
  revalidatePath("/admin/agenda");
}

export async function createCategory(name: string): Promise<ActionState & { id?: string }> {
  const { supabase } = await requireAdmin();
  const parsed = productCategorySchema.safeParse({ name });
  if (!parsed.success) return validationError(parsed.error);

  // Va al final de la lista: el orden de las categorías es el de creación.
  const { data: last } = await supabase
    .from("product_categories")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await supabase
    .from("product_categories")
    .insert({ name: parsed.data.name, sort_order: (last?.sort_order ?? 0) + 1 })
    .select("id")
    .single();

  if (error) {
    if (error.code === UNIQUE_VIOLATION) return actionError("Ya hay una categoría con ese nombre.");
    return actionError(`No se pudo crear la categoría: ${error.message}`);
  }

  revalidateProducts();
  return { ...actionSuccess("Categoría creada."), id: data.id };
}

export async function renameCategory(id: string, name: string): Promise<ActionState> {
  const { supabase } = await requireAdmin();
  const parsed = productCategorySchema.safeParse({ name });
  if (!parsed.success) return validationError(parsed.error);

  const { error } = await supabase
    .from("product_categories")
    .update({ name: parsed.data.name })
    .eq("id", id);

  if (error) {
    if (error.code === UNIQUE_VIOLATION) return actionError("Ya hay una categoría con ese nombre.");
    return actionError(`No se pudo renombrar la categoría: ${error.message}`);
  }

  revalidateProducts();
  return actionSuccess("Categoría renombrada.");
}

/** Solo una categoría vacía: la base impide borrar una con productos. */
export async function deleteCategory(id: string): Promise<ActionState> {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("product_categories").delete().eq("id", id);

  if (error) {
    if (error.code === FOREIGN_KEY_VIOLATION) {
      return actionError("La categoría tiene productos: borralos o movelos antes.");
    }
    return actionError(`No se pudo borrar la categoría: ${error.message}`);
  }

  revalidateProducts();
  return actionSuccess("Categoría borrada.");
}

/** Crea un producto, o lo edita si llega `id`. */
export async function saveProduct(input: {
  id?: string;
  categoryId: string;
  name: string;
  price: string | number;
}): Promise<ActionState> {
  const { supabase } = await requireAdmin();
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);

  const row = {
    category_id: parsed.data.categoryId,
    name: parsed.data.name,
    price: parsed.data.price,
  };

  const { error } = input.id
    ? await supabase.from("products").update(row).eq("id", input.id)
    : await supabase.from("products").insert(row);

  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      return actionError("Ya hay un producto con ese nombre en la categoría.", {
        name: "Ya existe en esta categoría",
      });
    }
    return actionError(`No se pudo guardar el producto: ${error.message}`);
  }

  revalidateProducts();
  return actionSuccess(input.id ? "Producto actualizado." : "Producto agregado.");
}

/**
 * Las ventas ya registradas conservan el nombre y el precio del producto
 * (`walk_in_sales` los copia al vender), así que borrarlo no cambia la Caja.
 */
export async function deleteProduct(id: string): Promise<ActionState> {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) return actionError(`No se pudo borrar el producto: ${error.message}`);

  revalidateProducts();
  return actionSuccess("Producto borrado.");
}
