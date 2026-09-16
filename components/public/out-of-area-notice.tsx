"use client";

import { MessageCircle } from "lucide-react";

import { toWhatsappNumber } from "@/lib/phone";

/**
 * Salida para quien tiene una línea de otra zona.
 *
 * Va en línea y no en un modal: en un celular el modal tapa el resumen de la
 * reserva y deja el botón de WhatsApp detrás de un scroll, justo cuando es lo
 * único que le queda por hacer al visitante.
 *
 * El turno NO se registra, así que el horario sigue disponible para otro. Por
 * eso el mensaje dice "quería" y no da el horario por reservado: para cuando el
 * barbero lo lea puede estar tomado, y prometerlo sería mentirle al cliente.
 */
export function OutOfAreaNotice({
  businessWhatsapp,
  serviceName,
  dateLabel,
  timeLabel,
}: {
  /** Teléfono del local, tal como está guardado en `settings.phone`. */
  businessWhatsapp: string | null;
  serviceName: string;
  dateLabel: string;
  timeLabel: string;
}) {
  const number = businessWhatsapp ? toWhatsappNumber(businessWhatsapp) : null;

  const message = `Hola, tengo una línea de otra localidad y quería agendar un turno para el ${dateLabel} a las ${timeLabel} para el servicio ${serviceName}.`;

  return (
    <div className="border-border bg-[var(--hs-surface-raised)] border p-5">
      <p className="text-sm">
        Para números fuera del área local, la reserva debe coordinarse directamente
        con el local.
      </p>

      {number ? (
        <a
          href={`https://wa.me/${number}?text=${encodeURIComponent(message)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-foreground text-background hover:bg-[var(--hs-graphite)] focus-visible:ring-ring mt-4 inline-flex items-center gap-2 px-5 py-3 text-sm tracking-[0.08em] uppercase transition-colors focus-visible:ring-2 focus-visible:outline-none"
        >
          <MessageCircle className="size-4" />
          Coordinar por WhatsApp
        </a>
      ) : (
        // Sin número cargado en la configuración no se puede ofrecer el atajo,
        // pero el visitante igual tiene que saber qué hacer.
        <p className="text-muted-foreground mt-3 text-sm">
          Comunicate con el local para coordinar tu turno.
        </p>
      )}

      <p className="text-muted-foreground mt-4 text-xs">
        Si te equivocaste al escribirlo, corregí el número y seguí normalmente.
      </p>
    </div>
  );
}
