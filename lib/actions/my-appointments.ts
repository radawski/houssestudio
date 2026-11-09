"use server";

import { headers } from "next/headers";

import { formatCurrency, formatLongDate, formatTime } from "@/lib/format";
import { firstName, phonesMatch, splitMyAppointments } from "@/lib/my-appointments";
import { checkRateLimit } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AppointmentStatus } from "@/lib/supabase/database.types";
import { deriveManageToken, manageTokenMatches } from "@/lib/tokens";
import { identifySchema } from "@/lib/validation/schemas";

export type MyAppointment = {
  id: string;
  date: string;
  time: string;
  service: string;
  price: string;
  status: AppointmentStatus;
  /** `/turno/<token>`, o `null` para turnos anteriores a los tokens derivados. */
  href: string | null;
};

export type MyAppointmentsResult =
  | { status: "idle" }
  | { status: "found"; name: string; upcoming: MyAppointment[]; past: MyAppointment[] }
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
 * No hay sesión: cada consulta vuelve a pedir los dos datos. Cada turno lleva
 * el link a `/turno/<token>`, la misma página del mail, que es donde se ve el
 * detalle y se cancela. Así no hay un segundo camino de cancelación que
 * mantener.
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
    .select("id, full_name, phone")
    .eq("dni", dni)
    .maybeSingle();

  if (!customer || !phonesMatch(rawPhone, customer.phone)) {
    return { status: "error", message: NOT_FOUND };
  }

  const { data: rows, error } = await supabase
    .from("appointments")
    .select("id, starts_at, ends_at, status, service_name_at_booking, price_at_booking, manage_token_hash")
    .eq("customer_id", customer.id)
    .order("starts_at", { ascending: false })
    .limit(50);

  if (error) {
    return { status: "error", message: "No pudimos cargar tus turnos. Probá de nuevo en un momento." };
  }

  const toItem = (row: NonNullable<typeof rows>[number]): MyAppointment => ({
    id: row.id,
    date: formatLongDate(row.starts_at),
    time: `${formatTime(row.starts_at)} – ${formatTime(row.ends_at)}`,
    service: row.service_name_at_booking,
    price: formatCurrency(row.price_at_booking),
    status: row.status,
    href: manageTokenMatches(row.id, row.manage_token_hash) ? `/turno/${deriveManageToken(row.id)}` : null,
  });

  const { upcoming, past } = splitMyAppointments(rows ?? []);
  return {
    status: "found",
    name: firstName(customer.full_name),
    upcoming: upcoming.map(toItem),
    past: past.map(toItem),
  };
}
