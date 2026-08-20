import "server-only";

import { createClient } from "@/lib/supabase/server";

/**
 * Guarda de autorizacion para Server Actions.
 *
 * RLS ya impide que un no-admin escriba, pero el error que devuelve Postgres es
 * opaco. Esto falla antes y con un mensaje entendible, y deja la intencion
 * explicita en cada accion en vez de depender de un efecto de la base.
 */
export async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Necesitas iniciar sesion.");

  const { data: admin } = await supabase
    .from("admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!admin) throw new Error("Tu usuario no esta habilitado como administrador.");

  return { supabase, user };
}
