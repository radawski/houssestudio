import type { z } from "zod";

/**
 * Forma comun del retorno de las Server Actions, pensada para `useActionState`.
 *
 * Los errores por campo van separados del mensaje general para poder mostrarlos
 * debajo del input correspondiente en vez de amontonarlos arriba del formulario.
 */
export type ActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string>;
};

export const idleState: ActionState = { status: "idle" };

export function actionError(message: string, fieldErrors?: Record<string, string>): ActionState {
  return { status: "error", message, fieldErrors };
}

export function actionSuccess(message?: string): ActionState {
  return { status: "success", message };
}

/** Aplana los issues de Zod a un error por campo (el primero de cada uno). */
export function fieldErrorsFrom(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "_");
    result[key] ??= issue.message;
  }
  return result;
}

export function validationError(error: z.ZodError): ActionState {
  return actionError("Revisa los datos ingresados.", fieldErrorsFrom(error));
}
