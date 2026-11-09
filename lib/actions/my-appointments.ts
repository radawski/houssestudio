"use server";

import { cookies, headers } from "next/headers";

import {
  loadMyAppointments,
  MY_APPOINTMENTS_COOKIE,
  type MyAppointmentsList,
} from "@/lib/data/my-appointments";
import { phonesMatch } from "@/lib/my-appointments";
import { checkRateLimit } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { createMyAppointmentsSession, MY_APPOINTMENTS_SESSION_SECONDS } from "@/lib/tokens";
import { identifySchema } from "@/lib/validation/schemas";

export type MyAppointmentsResult =
  | { status: "idle" }
  | ({ status: "found" } & MyAppointmentsList)
  | { status: "error"; message: string };

/**
 * Mismo mensaje para "no existe ese DNI" y "el teléfono no coincide": así la
 * pantalla no sirve para averiguar si alguien es cliente.
 */
const NOT_FOUND = "No encontramos turnos con esos datos. Revisá el DNI y el teléfono, o escribinos por WhatsApp.";
const TOO_MANY = "Demasiados intentos. Esperá un minuto y volvé a probar.";

/** Pocos intentos: con DNI + teléfono, probar a ciegas tiene que ser lento. */
const LIMIT = { limit: 5, windowMs: 60_000 };

async function getClientIp(): Promise<string> {
  const store = await headers();
  return store.get("x-forwarded-for")?.split(",")[0]?.trim() || "desconocida";
}

/**
 * "Mis turnos": devuelve los turnos de un cliente que se identifica con su DNI
 * y el teléfono de su ficha.
 *
 * Si coinciden, deja una sesión corta (cookie firmada, 30 minutos) para que el
 * cliente pueda ir a un turno y volver a la lista sin escribir todo de nuevo.
 * La cookie lleva el id del cliente, nunca el DNI ni el teléfono.
 *
 * Cada turno lleva el link a `/turno/<token>`, la misma página del mail, que
 * es donde se ve el detalle y se cancela. Así no hay un segundo camino de
 * cancelación que mantener.
 *
 * Límite de 5 consultas por minuto por IP y otras 5 por DNI: el de IP frena a
 * quien prueba muchos DNI, el de DNI a quien prueba muchos teléfonos para uno
 * solo desde varias IP.
 *
 * Tiene la firma de `useActionState` para ir directo en el `action` del
 * formulario: así, si se envía antes de que cargue el JavaScript, viaja por
 * POST y el DNI y el teléfono no terminan en la URL ni en el historial.
 */
export async function lookupMyAppointments(
  _previous: MyAppointmentsResult,
  formData: FormData,
): Promise<MyAppointmentsResult> {
  const rawDni = String(formData.get("dni") ?? "");
  const rawPhone = String(formData.get("phone") ?? "");
  const parsed = identifySchema.safeParse({ dni: rawDni });
  if (!parsed.success) return { status: "error", message: NOT_FOUND };
  const { dni } = parsed.data;

  const ip = await getClientIp();
  const ipAllowed = checkRateLimit(`my-appointments:ip:${ip}`, LIMIT);
  const dniAllowed = checkRateLimit(`my-appointments:dni:${dni}`, LIMIT);
  if (!ipAllowed || !dniAllowed) return { status: "error", message: TOO_MANY };

  const supabase = createAdminClient();
  const { data: customer } = await supabase
    .from("customers")
    .select("id, phone")
    .eq("dni", dni)
    .maybeSingle();

  if (!customer || !phonesMatch(rawPhone, customer.phone)) {
    return { status: "error", message: NOT_FOUND };
  }

  const list = await loadMyAppointments(customer.id);
  if (!list) {
    return { status: "error", message: "No pudimos cargar tus turnos. Probá de nuevo en un momento." };
  }

  const store = await cookies();
  store.set(MY_APPOINTMENTS_COOKIE, createMyAppointmentsSession(customer.id), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MY_APPOINTMENTS_SESSION_SECONDS,
  });

  return { status: "found", ...list };
}

/** "Salir": cierra la sesión de "Mis turnos" en este navegador. */
export async function exitMyAppointments(): Promise<void> {
  const store = await cookies();
  store.delete(MY_APPOINTMENTS_COOKIE);
}
