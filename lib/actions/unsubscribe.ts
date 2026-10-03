"use server";

import { redirect } from "next/navigation";

import { createAdminClient } from "@/lib/supabase/admin";
import { readUnsubscribeToken } from "@/lib/tokens";

/**
 * Baja del recordatorio para volver (mail 1d). Se llama desde el botón de
 * `/baja/[token]`, nunca al abrir el link: los antivirus del correo abren
 * los links de los mails solos y darían de baja a la gente.
 *
 * El token se vuelve a verificar acá (no se confía en que la página lo haya
 * hecho). Solo marca la fecha la primera vez; tocar de nuevo no la cambia.
 */
export async function unsubscribeFromComebacks(token: string) {
  const customerId = readUnsubscribeToken(token);
  if (!customerId) redirect("/");

  const { error } = await createAdminClient()
    .from("customers")
    .update({ comeback_opt_out_at: new Date().toISOString() })
    .eq("id", customerId)
    .is("comeback_opt_out_at", null);
  if (error) throw new Error(`No se pudo registrar la baja: ${error.message}`);

  redirect(`/baja/${token}`);
}
