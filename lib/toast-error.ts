"use client";

import { toast } from "sonner";

import { friendlyErrorMessage } from "@/lib/error-message";

/**
 * Aviso de error del panel con la acción "Reintentar" adentro
 * (design/admin-iphone n-ToastError): un error sin salida obliga a rehacer
 * todo el camino. Sin `retry` (un error de validación, que hay que corregir
 * a mano) va sin botón.
 */
export function toastError(message: string, retry?: () => void) {
  toast.error(message, retry ? { action: { label: "Reintentar", onClick: retry } } : undefined);
}

/** Igual que `toastError`, a partir de un error atrapado (ver `friendlyErrorMessage`). */
export function toastActionError(error: unknown, fallback: string, retry?: () => void) {
  toastError(friendlyErrorMessage(error, fallback), retry);
}
