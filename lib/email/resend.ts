import "server-only";

import { Resend } from "resend";

import { resendApiKey } from "@/lib/email/env";

/**
 * Cliente de Resend, server-only por el mismo motivo que
 * `lib/supabase/admin.ts`: la API key nunca debe alcanzar un componente de
 * cliente, y el import de `server-only` hace fallar el build si eso pasa.
 */
let cached: Resend | null = null;

export function getResendClient(): Resend {
  if (!cached) {
    cached = new Resend(resendApiKey());
  }
  return cached;
}
