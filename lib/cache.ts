import { revalidatePath } from "next/cache";

/**
 * Revalida todo lo que depende del estado de un turno.
 *
 * Vive fuera de los archivos `"use server"` a propósito: si estuviera
 * exportada desde `lib/actions/appointments.ts`, Next.js la trataría como
 * una Server Action pública más, aunque no tenga ninguna razón para serlo.
 *
 * Cualquier cambio de estado afecta a la vez la agenda del panel, la bandeja
 * de pendientes y la disponibilidad pública: confirmar o cancelar mueve el
 * slot dentro o fuera de la grilla que ve el cliente en `/` y en
 * `/reservar`. La cancelación por el propio cliente (`cancelByToken`) toca
 * las mismas rutas que la del panel — por eso ambas comparten este helper en
 * vez de tener cada una su propia lista parcial.
 */
export function revalidateAgenda() {
  revalidatePath("/");
  revalidatePath("/reservar");
  revalidatePath("/admin");
  revalidatePath("/admin/agenda");
  revalidatePath("/admin/solicitudes");
}
