/**
 * Datos del negocio para la portada: el texto de horarios que se lee y los
 * datos estructurados (`HairSalon`) que leen Google y los asistentes.
 *
 * Los dos salen de las mismas funciones a partir de `business_hours` y de la
 * tabla de servicios: así lo que dice la página y lo que dice el JSON-LD no
 * pueden contradecirse, y cambiar un horario o un precio en el panel alcanza.
 */

import { BUSINESS_ADDRESS, BUSINESS_INSTAGRAM, BUSINESS_NAME, CURRENCY } from "@/lib/config";

/** Mismo formato que `BusinessDay` de `lib/data/availability.ts`. */
export type WeekDayHours = {
  weekday: number; // 0 = domingo, como `Date#getDay()` y `weekdayOf()`
  is_closed: boolean;
  ranges: { opens_at: string; closes_at: string }[];
};

/** Días que comparten exactamente los mismos bloques horarios. */
export type HoursGroup = {
  weekdays: number[];
  ranges: { opens: string; closes: string }[];
};

/** Orden de lectura: la semana arranca el lunes. */
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

const DAY_NAMES = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const SCHEMA_DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** Postgres devuelve `time` como `10:00:00`; se muestra `10:00`. */
const hhmm = (time: string) => time.slice(0, 5);

/**
 * Agrupa días seguidos (de lunes a domingo) con los mismos bloques. Los días
 * cerrados o sin bloques cortan el grupo y no aparecen.
 */
export function groupOpeningHours(days: WeekDayHours[]): HoursGroup[] {
  const byWeekday = new Map(days.map((day) => [day.weekday, day]));
  const groups: HoursGroup[] = [];
  let current: (HoursGroup & { key: string }) | null = null;

  for (const weekday of WEEK_ORDER) {
    const day = byWeekday.get(weekday);
    if (!day || day.is_closed || day.ranges.length === 0) {
      current = null;
      continue;
    }
    const ranges = day.ranges.map((r) => ({ opens: hhmm(r.opens_at), closes: hhmm(r.closes_at) }));
    const key = ranges.map((r) => `${r.opens}-${r.closes}`).join(",");
    if (current && current.key === key) {
      current.weekdays.push(weekday);
    } else {
      current = { weekdays: [weekday], ranges, key };
      groups.push(current);
    }
  }

  return groups.map(({ weekdays, ranges }) => ({ weekdays, ranges }));
}

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** "Martes", "Martes y miércoles" o "Martes a sábado". */
export function formatDays(weekdays: number[]): string {
  const first = DAY_NAMES[weekdays[0]];
  const last = DAY_NAMES[weekdays[weekdays.length - 1]];
  if (weekdays.length === 1) return capitalize(first);
  if (weekdays.length === 2) return `${capitalize(first)} y ${last}`;
  return `${capitalize(first)} a ${last}`;
}

/** "10:00 a 20:00" o, con corte, "10:00 a 13:00 y 16:00 a 20:00". */
export function formatRanges(ranges: HoursGroup["ranges"]): string {
  return ranges.map((r) => `${r.opens} a ${r.closes}`).join(" y ");
}

export function formatAddress(): string {
  return `${BUSINESS_ADDRESS.street}, ${BUSINESS_ADDRESS.locality}, ${BUSINESS_ADDRESS.region}`;
}

export function mapsUrl(): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${BUSINESS_NAME}, ${formatAddress()}`,
  )}`;
}

/** Datos estructurados `HairSalon` de la portada. */
export function buildBusinessJsonLd({
  siteUrl,
  groups,
  services,
  whatsappNumber,
}: {
  siteUrl: string;
  groups: HoursGroup[];
  services: { name: string; price: number }[];
  /** Formato de `toWhatsappNumber()` (`549…`), o `null` si no hay teléfono. */
  whatsappNumber: string | null;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "HairSalon",
    "@id": `${siteUrl}/#negocio`,
    name: BUSINESS_NAME,
    url: `${siteUrl}/`,
    image: `${siteUrl}/opengraph-image.png`,
    ...(whatsappNumber ? { telephone: `+${whatsappNumber}` } : {}),
    address: {
      "@type": "PostalAddress",
      streetAddress: BUSINESS_ADDRESS.street,
      addressLocality: BUSINESS_ADDRESS.locality,
      addressRegion: BUSINESS_ADDRESS.region,
      postalCode: BUSINESS_ADDRESS.postalCode,
      addressCountry: BUSINESS_ADDRESS.country,
    },
    openingHoursSpecification: groups.flatMap((group) =>
      group.ranges.map((range) => ({
        "@type": "OpeningHoursSpecification",
        dayOfWeek: group.weekdays.map((weekday) => SCHEMA_DAYS[weekday]),
        opens: range.opens,
        closes: range.closes,
      })),
    ),
    sameAs: [BUSINESS_INSTAGRAM],
    makesOffer: services.map((service) => ({
      "@type": "Offer",
      price: service.price,
      priceCurrency: CURRENCY,
      itemOffered: { "@type": "Service", name: service.name },
    })),
  };
}
