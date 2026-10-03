"use client";

import { MessageCircle } from "lucide-react";

import { buildOutOfAreaMessage, type OutOfAreaContact } from "@/lib/out-of-area-message";
import { toWhatsappNumber } from "@/lib/phone";

/**
 * Salida para quien tiene una línea de otra zona.
 *
 * Va en línea y no en un modal: en un celular el modal tapa el resumen de la
 * reserva y deja el botón de WhatsApp detrás de un scroll, justo cuando es lo
 * único que le queda por hacer al visitante.
 *
 * El texto del mensaje (y por qué dice "quería") está en
 * `lib/out-of-area-message.ts`.
 */
export function OutOfAreaNotice({
  businessWhatsapp,
  serviceName,
  dateLabel,
  timeLabel,
  contact,
}: {
  /** Teléfono del local, tal como está guardado en `settings.phone`. */
  businessWhatsapp: string | null;
  serviceName: string;
  dateLabel: string;
  timeLabel: string;
  /** Lo que el cliente ya escribió; va en el mensaje para cargarle la ficha. */
  contact: OutOfAreaContact | null;
}) {
  const number = businessWhatsapp ? toWhatsappNumber(businessWhatsapp) : null;

  const message = buildOutOfAreaMessage({ serviceName, dateLabel, timeLabel }, contact);

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
