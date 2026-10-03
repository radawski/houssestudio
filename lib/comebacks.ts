import { businessDateKey } from "@/lib/format";

/**
 * Recordatorio para volver (Fase 4, tasks/plan-mejoras-octubre.md) —
 * funciones puras.
 *
 * Le toca a quien tuvo su último turno completado hace entre 30 y 60 días
 * (contados como días de calendario en la zona del local), no tiene otro
 * turno pedido o confirmado por delante, no se dio de baja, tiene email y
 * todavía no recibió este mail por esa visita. El tope de 60 días evita que
 * la primera corrida le escriba a clientes que no vienen hace un año, y deja
 * margen si la tarea diaria se saltea un día (decisiones del usuario).
 *
 * Solo cuenta `completado`: un turno atendido que no se cobró no cuenta como
 * visita.
 */

export const COMEBACK_MIN_DAYS = 30;
export const COMEBACK_MAX_DAYS = 60;

/** Días de calendario entre dos claves `yyyy-MM-dd`. */
export function daysBetweenKeys(fromKey: string, toKey: string): number {
  const toUtc = (key: string) => {
    const [year, month, day] = key.split("-").map(Number);
    return Date.UTC(year, month - 1, day);
  };
  return Math.round((toUtc(toKey) - toUtc(fromKey)) / 86_400_000);
}

export type CompletedVisit = {
  /** Id del turno completado. */
  id: string;
  customerId: string;
  startsAt: string;
  serviceName: string;
};

export type ComebackCustomer = {
  id: string;
  fullName: string;
  email: string | null;
  /** Tiene `comeback_opt_out_at`. */
  optedOut: boolean;
};

export type Comeback = {
  customerId: string;
  /** Su último turno completado: la llave de "un mail por visita". */
  appointmentId: string;
  fullName: string;
  email: string;
  lastVisitAt: string;
  serviceName: string;
  daysSince: number;
};

export function pickComebacks({
  visits,
  customers,
  upcoming,
  alreadySent,
  today,
}: {
  /** Turnos completados de los últimos `COMEBACK_MAX_DAYS` días (o más). */
  visits: CompletedVisit[];
  customers: Map<string, ComebackCustomer>;
  /** Clientes con un turno pendiente o confirmado por delante. */
  upcoming: Set<string>;
  /** Turnos que ya tienen su 1d enviado. */
  alreadySent: Set<string>;
  today: string;
}): { send: Comeback[]; skipped: number } {
  const lastVisit = new Map<string, CompletedVisit>();
  for (const visit of visits) {
    const current = lastVisit.get(visit.customerId);
    if (!current || visit.startsAt > current.startsAt) lastVisit.set(visit.customerId, visit);
  }

  const send: Comeback[] = [];
  let skipped = 0;

  for (const visit of lastVisit.values()) {
    const daysSince = daysBetweenKeys(businessDateKey(visit.startsAt), today);
    if (daysSince < COMEBACK_MIN_DAYS || daysSince > COMEBACK_MAX_DAYS) continue;

    const customer = customers.get(visit.customerId);
    const email = customer?.email?.trim();
    if (!customer || !email || customer.optedOut || upcoming.has(customer.id) || alreadySent.has(visit.id)) {
      skipped += 1;
      continue;
    }

    send.push({
      customerId: customer.id,
      appointmentId: visit.id,
      fullName: customer.fullName,
      email,
      lastVisitAt: visit.startsAt,
      serviceName: visit.serviceName,
      daysSince,
    });
  }

  return { send, skipped };
}
