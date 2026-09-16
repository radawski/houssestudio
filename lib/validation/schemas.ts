import { z } from "zod";

import { checkPhone, normalizePhone as normalizePhoneValue } from "@/lib/phone";

/**
 * Schemas compartidos por el formulario del navegador y la validacion del
 * servidor. Que sean los mismos evita el clasico desfasaje en el que el front
 * acepta algo que el back rechaza.
 */

/**
 * La normalización del teléfono vive en `lib/phone.ts`, junto con el área de
 * atención: sacar el `15` y reconocer la característica son el mismo problema.
 */
export { normalizePhone } from "@/lib/phone";

/**
 * Valida la FORMA del teléfono, no la zona.
 *
 * Un número de otra provincia pasa este schema a propósito: no es un error de
 * tipeo sino una bifurcación del flujo, y la resuelve `createBooking`
 * derivando al cliente a coordinar por WhatsApp. Tratarlo como error de campo
 * lo dejaría corrigiendo un número que está bien escrito.
 */
const phoneSchema = z
  .string()
  .trim()
  .min(1, "Ingresa tu telefono")
  .refine((v) => checkPhone(v).kind !== "invalid", {
    message: "El telefono no parece valido. Ej: 342 533-1802",
  })
  .transform(normalizePhoneValue);

/**
 * Normaliza un DNI a solo digitos, con el mismo criterio que `normalizePhone`
 * y por el mismo motivo: "30.123.456", "30 123 456" y "30123456" tienen que
 * resolver a la misma ficha, o cada forma de escribirlo crearia un cliente
 * nuevo y partiria el historial.
 */
export function normalizeDni(input: string): string {
  return input.replace(/\D/g, "");
}

const dniSchema = z
  .string()
  .trim()
  .min(1, "Ingresa tu DNI")
  .transform(normalizeDni)
  .refine((v) => /^\d{7,8}$/.test(v), {
    message: "El DNI no es valido. Ej: 30123456",
  });

export const loginSchema = z.object({
  email: z.email("Ingresa un email valido"),
  password: z.string().min(6, "La contrasena debe tener al menos 6 caracteres"),
});

/** Para la consulta que dispara el reconocimiento del cliente por DNI. */
export const identifySchema = z.object({
  dni: dniSchema,
});

const fullNameSchema = z
  .string()
  .trim()
  .min(2, "Ingresa tu nombre completo")
  .max(80, "El nombre es demasiado largo");

const emailSchema = z.email("Ingresa un email valido").max(120);

/**
 * `fullName`, `phone` y `email` son opcionales a proposito: son obligatorios
 * solo cuando el DNI no tiene ficha previa, y eso lo decide el servidor
 * despues de consultar la base, no este schema. `createBooking` exige los tres
 * a mano en ese caso.
 */
export const bookingSchema = z.object({
  serviceId: z.uuid("Elegi un servicio"),
  /** Instante de inicio en ISO 8601, tal como lo devolvio el motor de slots. */
  startsAt: z.iso.datetime({ offset: true }),
  dni: dniSchema,
  fullName: fullNameSchema.optional(),
  phone: phoneSchema.optional(),
  email: emailSchema.optional(),
  note: z.string().trim().max(300, "La nota es demasiado larga").optional(),
});

export const serviceSchema = z.object({
  name: z.string().trim().min(2, "Ingresa un nombre").max(60),
  description: z.string().trim().max(200).optional(),
  price: z.coerce.number<number>().min(0, "El precio no puede ser negativo").max(10_000_000),
  durationMinutes: z.coerce
    .number<number>()
    .int("Usa minutos enteros")
    .min(5, "La duracion minima es 5 minutos")
    .max(480, "La duracion maxima es 8 horas"),
  isActive: z.boolean().default(true),
});

export const businessHourSchema = z
  .object({
    weekday: z.coerce.number<number>().int().min(0).max(6),
    isClosed: z.boolean(),
    /** `HH:MM` en hora local del local. */
    opensAt: z.string().regex(/^\d{2}:\d{2}$/, "Formato invalido"),
    closesAt: z.string().regex(/^\d{2}:\d{2}$/, "Formato invalido"),
  })
  .refine((v) => v.isClosed || v.closesAt > v.opensAt, {
    message: "El cierre tiene que ser posterior a la apertura",
    path: ["closesAt"],
  });

export const timeBlockSchema = z
  .object({
    /** `yyyy-MM-dd` en hora local del local. */
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Elegi una fecha"),
    startTime: z.string().regex(/^\d{2}:\d{2}$/, "Formato invalido"),
    endTime: z.string().regex(/^\d{2}:\d{2}$/, "Formato invalido"),
    reason: z.string().trim().max(120).optional(),
  })
  .refine((v) => v.endTime > v.startTime, {
    message: "El fin tiene que ser posterior al inicio",
    path: ["endTime"],
  });

export const paymentSchema = z.object({
  appointmentId: z.uuid(),
  amount: z.coerce.number<number>().min(0, "El monto no puede ser negativo").max(10_000_000),
  method: z.enum(["efectivo", "transferencia"]),
});

export type BookingInput = z.infer<typeof bookingSchema>;
export type ServiceInput = z.infer<typeof serviceSchema>;
export type TimeBlockInput = z.infer<typeof timeBlockSchema>;
export type PaymentInput = z.infer<typeof paymentSchema>;
