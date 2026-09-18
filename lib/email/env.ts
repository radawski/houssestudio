/**
 * Lectura de variables de entorno de email, mismo patrón que
 * `lib/supabase/env.ts`: falla temprano con un mensaje legible en vez de
 * dejar que un `undefined` viaje hasta un error opaco de Resend.
 */
function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Falta la variable de entorno ${name}. Copiala de .env.local.example a .env.local.`,
    );
  }
  return value;
}

export const resendApiKey = () => required("RESEND_API_KEY", process.env.RESEND_API_KEY);

export const emailFrom = () => required("EMAIL_FROM", process.env.EMAIL_FROM);

/** Dirección del barbero para los avisos internos (solicitud nueva, cancelación). */
export const adminEmail = () => required("ADMIN_EMAIL", process.env.ADMIN_EMAIL);
