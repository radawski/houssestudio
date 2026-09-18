"use client";

import { useState, useTransition } from "react";
import { Banknote, Check, UserX, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  cancelAppointment,
  completeAppointment,
  confirmAppointment,
  markNoShow,
} from "@/lib/actions/appointments";
import type { PaymentMethod } from "@/lib/supabase/database.types";

export function ConfirmAppointmentButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          try {
            await confirmAppointment(id);
            toast.success("Turno confirmado.");
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "No se pudo confirmar.");
          }
        })
      }
    >
      <Check className="size-4" />
      Aceptar
    </Button>
  );
}

export function CancelAppointmentButton({
  id,
  label = "Rechazar",
}: {
  id: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, startTransition] = useTransition();

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <X className="size-4" />
        {label}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cancelar turno</DialogTitle>
            <DialogDescription>
              El horario vuelve a quedar disponible al instante. El motivo se le
              envía al cliente.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor={`reason-${id}`}>Motivo (opcional)</Label>
            <Textarea
              id={`reason-${id}`}
              rows={3}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Se me superpuso con otro compromiso…"
            />
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
              Volver
            </Button>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  try {
                    await cancelAppointment(id, reason);
                    toast.success("Turno cancelado.");
                    setOpen(false);
                    setReason("");
                  } catch (error) {
                    toast.error(
                      error instanceof Error ? error.message : "No se pudo cancelar.",
                    );
                  }
                })
              }
            >
              {pending ? "Cancelando…" : "Cancelar turno"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * Cierra un turno confirmado: lo marca completado y registra el cobro en el
 * mismo paso (lo garantiza `completeAppointment` con una función de
 * Postgres, no esta pantalla).
 */
export function CompleteAppointmentButton({
  id,
  suggestedAmount,
}: {
  id: string;
  suggestedAmount: number;
}) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(String(suggestedAmount));
  const [method, setMethod] = useState<PaymentMethod>("efectivo");
  const [pending, startTransition] = useTransition();

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Banknote className="size-4" />
        Marcar cobrado
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Marcar turno cobrado</DialogTitle>
            <DialogDescription>
              Cierra el turno como completado y registra el cobro en el mismo paso.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor={`amount-${id}`}>Monto</Label>
              <Input
                id={`amount-${id}`}
                type="number"
                min={0}
                step={100}
                inputMode="numeric"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`method-${id}`}>Medio de pago</Label>
              <Select value={method} onValueChange={(value) => setMethod(value as PaymentMethod)}>
                <SelectTrigger id={`method-${id}`} className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="efectivo">Efectivo</SelectItem>
                  <SelectItem value="transferencia">Transferencia</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
              Volver
            </Button>
            <Button
              disabled={pending || !amount}
              onClick={() =>
                startTransition(async () => {
                  try {
                    await completeAppointment(id, { amount: Number(amount), method });
                    toast.success("Turno cobrado.");
                    setOpen(false);
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : "No se pudo cobrar.");
                  }
                })
              }
            >
              {pending ? "Guardando…" : "Marcar cobrado"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function MarkNoShowButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          try {
            await markNoShow(id);
            toast.success("Turno marcado como ausente.");
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "No se pudo marcar.");
          }
        })
      }
    >
      <UserX className="size-4" />
      Marcar ausente
    </Button>
  );
}
