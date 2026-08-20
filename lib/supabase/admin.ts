import "server-only";

import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";
import { supabaseServiceRoleKey, supabaseUrl } from "@/lib/supabase/env";

/**
 * Cliente con service_role: saltea RLS por completo.
 *
 * Es el unico camino por el que el portal publico toca la base, siempre desde
 * el servidor. El import de `server-only` hace que el build falle si alguna vez
 * este modulo termina alcanzado por un componente de cliente, que es la forma
 * en que esta clave se filtraria al navegador.
 *
 * Regla al usarlo: como no hay RLS que ataje, cada consulta debe filtrar
 * explicitamente lo que corresponde (por token, por id, por rango de fechas).
 */
let cached: ReturnType<typeof createClient<Database>> | null = null;

export function createAdminClient() {
  if (!cached) {
    cached = createClient<Database>(supabaseUrl(), supabaseServiceRoleKey(), {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return cached;
}
