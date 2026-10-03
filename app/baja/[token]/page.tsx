import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Check } from "lucide-react";

import { SubmitButton } from "@/app/baja/[token]/submit-button";
import { unsubscribeFromComebacks } from "@/lib/actions/unsubscribe";
import { BUSINESS_NAME } from "@/lib/config";
import { createAdminClient } from "@/lib/supabase/admin";
import { readUnsubscribeToken } from "@/lib/tokens";

export const metadata: Metadata = { title: "Recordatorios", robots: { index: false } };

export const dynamic = "force-dynamic";

const KEEPS_ARRIVING =
  "Los avisos de tus turnos (la confirmación y el recordatorio del día anterior) siguen llegando.";

/**
 * Baja del recordatorio para volver (link "No quiero recibir recordatorios"
 * del mail 1d). Abrir el link no cambia nada: la baja es el botón, porque los
 * antivirus del correo abren los links solos. Un token inválido es 404.
 */
export default async function UnsubscribePage({ params }: PageProps<"/baja/[token]">) {
  const { token } = await params;
  const customerId = readUnsubscribeToken(token);
  if (!customerId) notFound();

  const { data: customer } = await createAdminClient()
    .from("customers")
    .select("full_name, comeback_opt_out_at")
    .eq("id", customerId)
    .maybeSingle();
  if (!customer) notFound();

  const firstName = customer.full_name.trim().split(/\s+/)[0];
  const done = customer.comeback_opt_out_at !== null;

  return (
    <main className="flex min-h-dvh flex-1 flex-col px-6 py-10 sm:px-10">
      <Link href="/" className="text-xs tracking-[var(--hs-tracking-wide)] uppercase">
        {BUSINESS_NAME}
      </Link>

      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center py-12">
        {done ? (
          <>
            <span className="border-foreground mb-6 flex size-12 items-center justify-center border">
              <Check className="size-5" />
            </span>
            <h1 className="text-3xl font-light tracking-[var(--hs-tracking-tight)] sm:text-4xl">Listo</h1>
            <p className="text-muted-foreground mt-3 text-sm">
              Ya no te vamos a escribir para recordarte que reserves. {KEEPS_ARRIVING}
            </p>
            <div className="border-border mt-10 border-t pt-6">
              <Link
                href="/"
                className="bg-foreground text-background hover:bg-[var(--hs-graphite)] focus-visible:ring-ring inline-flex min-h-11 items-center gap-2 px-6 py-3 text-sm tracking-[0.08em] uppercase transition-colors focus-visible:ring-2 focus-visible:outline-none"
              >
                <ArrowLeft className="size-4" />
                Volver al inicio
              </Link>
            </div>
          </>
        ) : (
          <>
            <h1 className="text-3xl font-light tracking-[var(--hs-tracking-tight)] sm:text-4xl">
              Recordatorios para volver
            </h1>
            <p className="text-muted-foreground mt-3 text-sm">
              Hola {firstName}, cuando pasa un mes de tu último corte te escribimos para que reserves el
              próximo. ¿Querés dejar de recibir esos mails?
            </p>
            <p className="text-muted-foreground mt-2 text-sm">{KEEPS_ARRIVING}</p>
            <form action={unsubscribeFromComebacks.bind(null, token)} className="border-border mt-10 border-t pt-6">
              <SubmitButton />
            </form>
          </>
        )}
      </div>
    </main>
  );
}
