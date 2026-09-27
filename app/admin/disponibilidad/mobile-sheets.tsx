"use client";

import { useState } from "react";
import { ChevronRight, Plus } from "lucide-react";

import { BookingWindowForm } from "@/app/admin/disponibilidad/booking-window-form";
import { TimeBlockForm } from "@/app/admin/disponibilidad/time-blocks";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

/**
 * "Ventana de reserva" colapsada en una fila con su resumen; los dos campos
 * viven en su propia hoja (design/admin-iphone n-Disponibilidad, bloque 1).
 */
export function BookingWindowSheet({
  maxBookingDays,
  minLeadMinutes,
}: {
  maxBookingDays: number;
  minLeadMinutes: number;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="bg-card flex w-full items-center gap-3 rounded-md border border-[var(--hs-border-card)] px-3.5 py-3 text-left"
        >
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium">Ventana de reserva</span>
            <span className="text-muted-foreground block text-[13px] tabular-nums">
              Hasta {maxBookingDays} {maxBookingDays === 1 ? "día" : "días"} · anticipación
              mínima {minLeadMinutes} min
            </span>
          </span>
          <ChevronRight className="text-muted-foreground size-4.5 shrink-0" />
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ventana de reserva</DialogTitle>
          <DialogDescription>
            Con cuánta anticipación se puede pedir un turno. No afecta a los turnos ya tomados.
          </DialogDescription>
        </DialogHeader>
        <BookingWindowForm
          maxBookingDays={maxBookingDays}
          minLeadMinutes={minLeadMinutes}
          onSaved={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

/** "+ Bloquear un rango" a ancho completo, que abre el formulario en una hoja. */
export function TimeBlockSheet({ todayKey }: { todayKey: string }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="touch" className="w-full">
          <Plus className="size-4" />
          Bloquear un rango
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Bloquear un rango</DialogTitle>
          <DialogDescription>
            Almuerzos, trámites, feriados o imprevistos. Deja de ofrecerse en el portal público.
          </DialogDescription>
        </DialogHeader>
        <TimeBlockForm todayKey={todayKey} onSaved={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
