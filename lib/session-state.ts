import { isAuthApiError, isAuthRetryableFetchError, isAuthSessionMissingError } from "@supabase/supabase-js";

/**
 * Qué mostrar en la tarjeta de sesión de Más (diseño "Estados de carga",
 * n-MasError).
 *
 * Una sesión vencida no es un error de pantalla: va al login. Una falla para
 * llegar a Supabase sí lo es, y se queda dentro de la tarjeta con
 * "Reintentar", porque el resto de Más no depende de ese pedido.
 */
export type SessionState =
  | { kind: "ok"; email: string | undefined }
  | { kind: "expired" }
  | { kind: "error"; reason: "Error de red" | "Error del servidor" | "Error inesperado" };

export function classifySession({
  user,
  error,
}: {
  user: { email?: string } | null;
  error: unknown;
}): SessionState {
  if (user) return { kind: "ok", email: user.email };
  if (!error || isAuthSessionMissingError(error)) return { kind: "expired" };
  if (isAuthRetryableFetchError(error)) return { kind: "error", reason: "Error de red" };
  if (isAuthApiError(error)) {
    return error.status >= 500 ? { kind: "error", reason: "Error del servidor" } : { kind: "expired" };
  }
  return { kind: "error", reason: "Error inesperado" };
}
