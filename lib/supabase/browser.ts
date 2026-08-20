import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "@/lib/supabase/database.types";
import { supabaseAnonKey, supabaseUrl } from "@/lib/supabase/env";

/**
 * Cliente para componentes de cliente. Usa la clave anonima, que con RLS activo
 * y sin politicas para `anon` no da acceso a ninguna tabla: sirve unicamente
 * para el flujo de login del barbero.
 */
export function createClient() {
  return createBrowserClient<Database>(supabaseUrl(), supabaseAnonKey());
}
