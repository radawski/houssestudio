"use client";

import { useState, useTransition, type TransitionStartFunction } from "react";
import { Banknote, Check, Mail, Phone, UserX, X } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  cancelAppointment,
  completeAppointment,
  confirmAppointment,
  markNoShow,
} from "@/lib/actions/appointments";
import { formatCurrency, formatDateTime, formatDayAndTime } from "@/lib/format";
import { toastActionError } from "@/lib/toast-error";
import type { PaymentMethod } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";

export function ConfirmAppointmentButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      size="touch"
      className="flex-1"
      disabled={pending}
      onClick={function run() {
        startTransition(async () => {
          try {
            await confirmAppointment(id);
            toast.success("Turno confirmado.");
          } catch (error) {
            toastActionError(error, "No se pudo aceptar el turno.", run);
          }
        });
      }}
    >
      <Check className="size-4" />
      Aceptar
    </Button>
  );
}

/** Motivos de un toque (design/admin-iphone n-SheetRechazar): escribir con una mano es lo que deja el campo vacío. */
const QUICK_REASONS = ["Me surgió un imprevisto", "Ese día no abro", "Horario ya ocupado"] as const;

/**
 * Rechaza una solicitud o cancela un turno confirmado. Nunca actúa directo:
 * abre la hoja de confirmación, que es el único lugar del panel con rojo
 * sólido (n-SheetRechazar).
 */
export function CancelAppointmentButton({
  id,
  label = "Rechazar",
  clientName,
  startsAt,
}: {
  id: string;
  label?: string;
  clientName?: string;
  startsAt?: string;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, startTransition] = useTransition();
  const title = `${label} turno`;
  const context = [clientName, startsAt ? formatDayAndTime(startsAt) : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      <Button size="touch" variant="outline" className="flex-1" onClick={() => setOpen(true)}>
        <X className="size-4" />
        {label}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>
              {context ? `${context}. ` : null}El horario vuelve a quedar disponible al
              instante.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor={`reason-${id}`}>Motivo (opcional)</Label>
            <Textarea
              id={`reason-${id}`}
              className="min-h-[88px] text-base md:text-sm"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Se me superpuso con otro compromiso…"
            />
            <p className="text-muted-foreground text-xs">
              Se lo mandamos al cliente junto con el aviso.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {QUICK_REASONS.map((quick) => (
                <button
                  key={quick}
                  type="button"
                  aria-pressed={reason === quick}
                  onClick={() => setReason(quick)}
                  className={cn(
                    "h-9 rounded-full border px-3.5 text-[13px] transition-colors",
                    reason === quick
                      ? "border-foreground text-foreground"
                      : "text-muted-foreground border-[var(--hs-border-card)] hover:text-foreground",
                  )}
                >
                  {quick}
                </button>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" size="touch-lg" onClick={() => setOpen(false)} disabled={pending}>
              Volver
            </Button>
            <Button
              size="touch-xl"
              className="bg-destructive hover:bg-destructive/90 text-white"
              disabled={pending}
              onClick={function run() {
                startTransition(async () => {
                  try {
                    await cancelAppointment(id, reason);
                    toast.success(label === "Rechazar" ? "Solicitud rechazada." : "Turno cancelado.");
                    setOpen(false);
                    setReason("");
                  } catch (error) {
                    toastActionError(
                      error,
                      label === "Rechazar" ? "No se pudo rechazar el turno." : "No se pudo cancelar el turno.",
                      run,
                    );
                  }
                });
              }}
            >
              <X className="size-4" />
              {pending ? (label === "Rechazar" ? "Rechazando…" : "Cancelando…") : title}
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
 *
 * `pending`/`startTransition` llegan por afuera (ver
 * `ConfirmedAppointmentActions`): comparten el mismo estado "en vuelo" que
 * "No vino", para que esa acción se deshabilite mientras esta corre — es la
 * que rompería el registro si se toca dos veces (design/admin-iphone
 * n-AccionEnCurso).
 */
export function CompleteAppointmentButton({
  id,
  suggestedAmount,
  clientName,
  serviceName,
  startsAt,
  pending,
  startTransition,
}: {
  id: string;
  suggestedAmount: number;
  clientName: string;
  serviceName: string;
  startsAt: string;
  pending: boolean;
  startTransition: TransitionStartFunction;
}) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(String(suggestedAmount));
  const [method, setMethod] = useState<PaymentMethod>("efectivo");

  return (
    <>
      <Button size="touch" className="flex-1" disabled={pending} onClick={() => setOpen(true)}>
        {pending ? (
          <span className="border-background size-4 animate-spin rounded-full border-2 border-t-transparent" />
        ) : (
          <Banknote className="size-4" />
        )}
        {pending ? "Cobrando…" : "Cobrar"}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cobrar turno</DialogTitle>
            <DialogDescription>
              {clientName} · {serviceName} · {formatDateTime(startsAt)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor={`amount-${id}`}>Monto</Label>
              <div className="relative">
                <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm tabular-nums">
                  $
                </span>
                <Input
                  id={`amount-${id}`}
                  type="number"
                  min={0}
                  step={100}
                  inputMode="numeric"
                  className="h-12 pl-6.5 text-base tabular-nums"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                />
              </div>
              <p className="text-muted-foreground text-xs">
                Sugerido por el servicio: {formatCurrency(suggestedAmount)}
              </p>
            </div>

            <PaymentMethodPicker value={method} onChange={setMethod} />
          </div>

          <DialogFooter>
            <Button variant="ghost" size="touch-lg" onClick={() => setOpen(false)} disabled={pending}>
              Cancelar
            </Button>
            <Button
              size="touch-xl"
              disabled={pending || !amount}
              onClick={function run() {
                startTransition(async () => {
                  try {
                    await completeAppointment(id, { amount: Number(amount), method });
                    toast.success(`Turno cobrado · ${formatCurrency(Number(amount))} en ${method}.`);
                    setOpen(false);
                  } catch (error) {
                    toastActionError(error, "No se pudo cobrar el turno.", run);
                  }
                });
              }}
            >
              {pending ? "Cobrando…" : "Cobrar y completar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * Círculo dibujado a mano en vez del control nativo (design/admin-iphone
 * n-hojas): con dos opciones, un `<select>` no se justifica, y el estado
 * seleccionado tiene que leerse igual en cualquier navegador.
 */
function PaymentMethodPicker({
  value,
  onChange,
}: {
  value: PaymentMethod;
  onChange: (value: PaymentMethod) => void;
}) {
  const options: { value: PaymentMethod; label: string }[] = [
    { value: "efectivo", label: "Efectivo" },
    { value: "transferencia", label: "Transferencia" },
  ];

  return (
    <div className="space-y-1.5">
      <Label>Medio de pago</Label>
      <div className="grid grid-cols-2 gap-2">
        {options.map((option) => {
          const selected = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(option.value)}
              className={cn(
                "flex h-12 items-center gap-2.5 rounded-md border px-3 text-sm",
                selected ? "border-foreground font-medium" : "border-[var(--hs-mist)]",
              )}
            >
              <span
                className={cn(
                  "flex size-[18px] shrink-0 items-center justify-center rounded-full border",
                  selected ? "border-foreground bg-foreground" : "border-[var(--hs-mist)]",
                )}
              >
                {selected ? <span className="bg-background size-1.5 rounded-full" /> : null}
              </span>
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function MarkNoShowButton({
  id,
  pending,
  startTransition,
}: {
  id: string;
  pending: boolean;
  startTransition: TransitionStartFunction;
}) {
  return (
    <Button
      size="touch"
      className="flex-1"
      variant="outline"
      disabled={pending}
      onClick={function run() {
        startTransition(async () => {
          try {
            await markNoShow(id);
            toast.success("Turno marcado como ausente.");
          } catch (error) {
            toastActionError(error, "No se pudo marcar el turno como ausente.", run);
          }
        });
      }}
    >
      <UserX className="size-4" />
      No vino
    </Button>
  );
}

/** Fila completa de un turno confirmado (design/admin-iphone n-Main):
 * Cobrar + No vino comparten un solo estado "en vuelo" (`useTransition`) para
 * que tocar "No vino" mientras "Cobrar" está en curso quede bloqueado — es la
 * acción que rompería el registro si se dispara dos veces. Teléfono y mail
 * quedan siempre activos, sin mezclarse con ese estado.
 */
export function ConfirmedAppointmentActions({
  id,
  suggestedAmount,
  clientName,
  serviceName,
  startsAt,
  phone,
  email,
  showMarkNoShow,
}: {
  id: string;
  suggestedAmount: number;
  clientName: string;
  serviceName: string;
  startsAt: string;
  phone?: string;
  email?: string | null;
  showMarkNoShow: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <>
      <CompleteAppointmentButton
        id={id}
        suggestedAmount={suggestedAmount}
        clientName={clientName}
        serviceName={serviceName}
        startsAt={startsAt}
        pending={pending}
        startTransition={startTransition}
      />
      {showMarkNoShow ? (
        <MarkNoShowButton id={id} pending={pending} startTransition={startTransition} />
      ) : null}
      {phone ? (
        <Button asChild variant="outline" size="icon-touch">
          <a href={`tel:${phone}`} aria-label="Llamar al cliente">
            <Phone className="size-[18px]" />
          </a>
        </Button>
      ) : null}
      {email ? (
        <Button asChild variant="outline" size="icon-touch">
          <a href={`mailto:${email}`} aria-label="Enviar un mail al cliente">
            <Mail className="size-[18px]" />
          </a>
        </Button>
      ) : null}
    </>
  );
}
