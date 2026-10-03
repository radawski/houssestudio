/**
 * Texto que abre "Coordinar por WhatsApp" para quien tiene una línea de otra
 * zona (`components/public/out-of-area-notice.tsx`).
 *
 * El turno NO se registra, así que el horario sigue disponible para otro. Por
 * eso dice "quería" y no da el horario por reservado: para cuando el
 * peluquero lo lea puede estar tomado, y prometerlo sería mentirle al cliente.
 *
 * Lleva los datos que el cliente ya escribió para que el peluquero pueda
 * cargarle la ficha (Más → Agregar cliente) sin tener que pedírselos.
 */

export type OutOfAreaBooking = {
  serviceName: string;
  dateLabel: string;
  timeLabel: string;
};

export type OutOfAreaContact = {
  fullName: string;
  dni: string;
  phone: string;
  email: string;
};

export function buildOutOfAreaMessage(booking: OutOfAreaBooking, contact: OutOfAreaContact | null): string {
  const request = `Hola, tengo una línea de otra localidad y quería agendar un turno para el ${booking.dateLabel} a las ${booking.timeLabel} para el servicio ${booking.serviceName}.`;

  const lines = contact
    ? [
        ["Nombre", contact.fullName],
        ["DNI", contact.dni],
        ["Teléfono", contact.phone],
        ["Email", contact.email],
      ]
        .map(([label, value]) => [label, value.trim()])
        .filter(([, value]) => value.length > 0)
        .map(([label, value]) => `${label}: ${value}`)
    : [];

  return lines.length > 0 ? `${request}\n\nMis datos:\n${lines.join("\n")}` : request;
}
