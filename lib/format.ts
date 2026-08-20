import { TZDate } from "@date-fns/tz";
import { format } from "date-fns";
import { es } from "date-fns/locale";

import { BUSINESS_TIMEZONE, CURRENCY, LOCALE } from "@/lib/config";

const currencyFormatter = new Intl.NumberFormat(LOCALE, {
  style: "currency",
  currency: CURRENCY,
  maximumFractionDigits: 0,
});

export function formatCurrency(amount: number): string {
  return currencyFormatter.format(amount);
}

/** Convierte un instante a la hora local del local para poder formatearlo. */
export function toBusinessTime(date: Date | string): TZDate {
  const value = typeof date === "string" ? new Date(date) : date;
  return new TZDate(value, BUSINESS_TIMEZONE);
}

/** Formatea un instante en hora local del local. Ej: `formatInTz(d, "HH:mm")`. */
export function formatInTz(date: Date | string, pattern: string): string {
  return format(toBusinessTime(date), pattern, { locale: es });
}

/** `2026-08-15` en hora local del local, la clave que usa la agenda por dia. */
export function businessDateKey(date: Date | string): string {
  return formatInTz(date, "yyyy-MM-dd");
}

export function formatTime(date: Date | string): string {
  return formatInTz(date, "HH:mm");
}

/** Ej: `sábado 15 de agosto`. */
export function formatLongDate(date: Date | string): string {
  return formatInTz(date, "EEEE d 'de' MMMM");
}

/** Ej: `sábado 15 de agosto, 14:30`. */
export function formatDateTime(date: Date | string): string {
  return `${formatLongDate(date)}, ${formatTime(date)}`;
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}
