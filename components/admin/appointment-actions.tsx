"use client";

import { useState, useTransition, type TransitionStartFunction } from "react";
import { Banknote, Check, Mail, Pencil, Phone, RotateCcw, Undo2, UserX, X } from "lucide-react";
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
  correctPayment,
  markNoShow,
  restoreAppointment,
  undoNoShow,
  undoPayment,
} from "@/lib/actions/appointments";
import type { ActionState } from "@/lib/actions/result";
import { todayKey } from "@/lib/dates";
import { businessDateKey, formatCurrency, formatDateTime, formatDayAndTime } from "@/lib/format";
import { toastActionError, toastError } from "@/lib/toast-error";
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
  triggerLabel,
  triggerClassName,
}: {
  id: string;
  label?: string;
  clientName?: string;
  startsAt?: string;
  /** Texto del botón que abre la hoja; por defecto, `label`. */
  triggerLabel?: string;
  /** Clases del botón que abre la hoja; por defecto ocupa su parte de una fila. */
  triggerClassName?: string;
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
      <Button size="touch" variant="outline" className={triggerClassName ?? "flex-1"} onClick={() => setOpen(true)}>
        <X className="size-4" />
        {triggerLabel ?? label}
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
  const [method, setMethod] = useState<PaymentChoice>("efectivo");
  const [cash, setCash] = useState("");

  const total = Number(amount) || 0;
  const cashValue = Math.min(Math.max(Number(cash) || 0, 0), total);
  const split = method === "dividido";
  const payment = split
    ? { amount: total, method: "efectivo" as const, cash: cashValue }
    : { amount: total, method };
  const paidLabel = split
    ? `${formatCurrency(cashValue)} en efectivo y ${formatCurrency(total - cashValue)} por transferencia`
    : `${formatCurrency(total)} en ${method}`;

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
                  step={1}
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

            {split ? (
              <SplitAmounts total={total} cash={cash} onCashChange={setCash} idPrefix={`split-${id}`} />
            ) : null}
          </div>

          <DialogFooter>
            <Button variant="ghost" size="touch-lg" onClick={() => setOpen(false)} disabled={pending}>
              Cancelar
            </Button>
            <Button
              size="touch-xl"
              disabled={pending || !amount || (split && (Number(cash) || 0) > total)}
              onClick={function run() {
                startTransition(async () => {
                  try {
                    await completeAppointment(id, payment);
                    toast.success(`Turno cobrado · ${paidLabel}.`);
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
/** Medio de pago elegido en la hoja: uno de los dos, o los dos a la vez (0016). */
export type PaymentChoice = PaymentMethod | "dividido";

/**
 * Montos de un pago dividido (plan de noviembre, P2): se escribe el efectivo y
 * la transferencia se completa sola con lo que falta para el total.
 */
export function SplitAmounts({
  total,
  cash,
  onCashChange,
  idPrefix,
}: {
  total: number;
  cash: string;
  onCashChange: (value: string) => void;
  idPrefix: string;
}) {
  const cashValue = Math.min(Math.max(Number(cash) || 0, 0), total);
  const over = (Number(cash) || 0) > total;

  return (
    <div className="space-y-1.5">
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-cash`}>Efectivo</Label>
          <div className="relative">
            <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm">$</span>
            <Input
              id={`${idPrefix}-cash`}
              type="number"
              min={0}
              step={1}
              inputMode="numeric"
              className="h-12 pl-6.5 text-base tabular-nums"
              value={cash}
              onChange={(event) => onCashChange(event.target.value)}
              aria-invalid={over}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-transfer`}>Transferencia</Label>
          <div className="relative">
            <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm">$</span>
            <Input
              id={`${idPrefix}-transfer`}
              readOnly
              tabIndex={-1}
              className="bg-background text-muted-foreground h-12 pl-6.5 text-base tabular-nums"
              value={total - cashValue}
            />
          </div>
        </div>
      </div>
      <p className={cn("text-xs", over ? "text-destructive" : "text-muted-foreground")}>
        {over
          ? `El efectivo no puede superar el total (${formatCurrency(total)}).`
          : "Escribí lo que pagó en efectivo; el resto se completa solo."}
      </p>
    </div>
  );
}

export function PaymentMethodPicker({
  value,
  onChange,
}: {
  value: PaymentChoice;
  onChange: (value: PaymentChoice) => void;
}) {
  const options: { value: PaymentChoice; label: string }[] = [
    { value: "efectivo", label: "Efectivo" },
    { value: "transferencia", label: "Transferencia" },
    { value: "dividido", label: "Dividido" },
  ];

  return (
    <div className="space-y-1.5">
      <Label>Medio de pago</Label>
      <div className="grid grid-cols-3 gap-2">
        {options.map((option) => {
          const selected = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(option.value)}
              className={cn(
                // Tres opciones en el ancho del celular: un poco más compactas
                // para que "Transferencia" entre con su círculo.
                "flex h-12 min-w-0 items-center justify-center gap-1.5 rounded-md border px-2 text-[13px]",
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

// -----------------------------------------------------------------------------
// Correcciones (tasks/plan-correcciones-cobros.md)
// -----------------------------------------------------------------------------

/**
 * Corre una acción de corrección y avisa el resultado. Las correcciones
 * devuelven `ActionState` (ver `lib/actions/appointments.ts`): un rechazo de
 * la base ya viene explicado y va sin "Reintentar"; un error de red sí lo
 * lleva.
 */
async function runCorrection(
  action: () => Promise<ActionState>,
  fallback: string,
  retry: () => void,
): Promise<boolean> {
  try {
    const result = await action();
    if (result.status === "success") {
      toast.success(result.message ?? "Listo.");
      return true;
    }
    toastError(result.message ?? fallback);
    return false;
  } catch (error) {
    toastActionError(error, fallback, retry);
    return false;
  }
}

/** Ficha de un turno "No vino": lo devuelve a confirmado (el cliente llegó tarde). */
export function UndoNoShowButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      size="touch"
      variant="outline"
      disabled={pending}
      onClick={function run() {
        startTransition(async () => {
          await runCorrection(() => undoNoShow(id), 'No se pudo deshacer el "No vino".', run);
        });
      }}
    >
      <Undo2 className="size-4" />
      {pending ? "Deshaciendo…" : "Deshacer \u201cNo vino\u201d"}
    </Button>
  );
}

/**
 * Ficha de un turno que canceló o rechazó el peluquero: lo restaura. La hoja
 * dice adónde vuelve y si sale el mail, antes de tocar nada.
 */
export function RestoreAppointmentButton({
  id,
  target,
  clientName,
  startsAt,
  hasEmail,
}: {
  id: string;
  target: "confirmado" | "pendiente";
  clientName?: string;
  startsAt: string;
  hasEmail: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const upcoming = new Date(startsAt).getTime() > Date.now();
  const context = [clientName, formatDayAndTime(startsAt)].filter(Boolean).join(" · ");
  const outcome =
    target === "pendiente"
      ? "Vuelve a Solicitudes como pendiente, para que la aceptes o la rechaces de nuevo."
      : upcoming && hasEmail
        ? "Vuelve a la agenda como confirmado y le reenviamos al cliente el mail de turno confirmado."
        : "Vuelve a la agenda como confirmado.";

  return (
    <>
      <Button size="touch" variant="outline" className="w-full" onClick={() => setOpen(true)}>
        <RotateCcw className="size-4" />
        Restaurar turno
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Restaurar turno</DialogTitle>
            <DialogDescription>
              {context}. {outcome} Si el horario ya lo ocupa otro turno, no se puede restaurar.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" size="touch-lg" onClick={() => setOpen(false)} disabled={pending}>
              Volver
            </Button>
            <Button
              size="touch-xl"
              disabled={pending}
              onClick={function run() {
                startTransition(async () => {
                  const ok = await runCorrection(() => restoreAppointment(id), "No se pudo restaurar el turno.", run);
                  if (ok) setOpen(false);
                });
              }}
            >
              {pending ? "Restaurando…" : "Restaurar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export type RecordedPayment = {
  amount: number;
  method: PaymentMethod;
  cash_amount: number | null;
  transfer_amount: number | null;
  paid_at: string;
};

/**
 * Corregir un cobro ya registrado: monto, medio (o dividido) y día. Es el
 * mismo formulario que "Cobrar", con lo que se cargó ya puesto. Adentro está
 * "Deshacer cobro", con su propia confirmación, para cuando se cobró el turno
 * equivocado o antes de tiempo.
 *
 * Por defecto el disparador es un botón; Caja pasa su fila como `children`.
 */
export function CorrectPaymentButton({
  id,
  payment,
  clientName,
  serviceName,
  startsAt,
  children,
  triggerClassName,
}: {
  id: string;
  payment: RecordedPayment;
  clientName?: string;
  serviceName: string;
  startsAt?: string;
  children?: React.ReactNode;
  /** Clases del disparador cuando es `children` (una fila de Caja). */
  triggerClassName?: string;
}) {
  const initialSplit = payment.cash_amount !== null && payment.transfer_amount !== null;
  const [open, setOpen] = useState(false);
  const [confirmUndo, setConfirmUndo] = useState(false);
  const [amount, setAmount] = useState(String(payment.amount));
  const [method, setMethod] = useState<PaymentChoice>(initialSplit ? "dividido" : payment.method);
  const [cash, setCash] = useState(initialSplit ? String(payment.cash_amount) : "");
  const [paidOn, setPaidOn] = useState(businessDateKey(payment.paid_at));
  const [pending, startTransition] = useTransition();

  // Cada vez que se abre, arranca desde lo registrado (no desde un intento
  // anterior que se cerró sin guardar).
  function openDialog() {
    setAmount(String(payment.amount));
    setMethod(initialSplit ? "dividido" : payment.method);
    setCash(initialSplit ? String(payment.cash_amount) : "");
    setPaidOn(businessDateKey(payment.paid_at));
    setConfirmUndo(false);
    setOpen(true);
  }

  const total = Number(amount) || 0;
  const split = method === "dividido";
  const cashValue = Math.min(Math.max(Number(cash) || 0, 0), total);
  const today = todayKey();
  const context = [clientName, serviceName, startsAt ? formatDateTime(startsAt) : null].filter(Boolean).join(" · ");

  return (
    <>
      {children ? (
        <button type="button" className={triggerClassName ?? "w-full text-left"} onClick={openDialog}>
          {children}
        </button>
      ) : (
        <Button size="touch" variant="outline" className="w-full" onClick={openDialog}>
          <Pencil className="size-4" />
          Corregir cobro
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          {confirmUndo ? (
            <>
              <DialogHeader>
                <DialogTitle>Deshacer cobro</DialogTitle>
                <DialogDescription>
                  {context}. Se borra el cobro de {formatCurrency(payment.amount)} y el turno vuelve a
                  estar confirmado, para cobrarlo de nuevo o marcar que no vino. No se puede volver atrás.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="ghost" size="touch-lg" onClick={() => setConfirmUndo(false)} disabled={pending}>
                  Volver
                </Button>
                <Button
                  size="touch-xl"
                  className="bg-destructive hover:bg-destructive/90 text-white"
                  disabled={pending}
                  onClick={function run() {
                    startTransition(async () => {
                      const ok = await runCorrection(() => undoPayment(id), "No se pudo deshacer el cobro.", run);
                      if (ok) setOpen(false);
                    });
                  }}
                >
                  {pending ? "Deshaciendo…" : "Deshacer cobro"}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Corregir cobro</DialogTitle>
                <DialogDescription>{context}</DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor={`fix-amount-${id}`}>Monto</Label>
                  <div className="relative">
                    <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm tabular-nums">
                      $
                    </span>
                    <Input
                      id={`fix-amount-${id}`}
                      type="number"
                      min={0}
                      step={1}
                      inputMode="numeric"
                      className="h-12 pl-6.5 text-base tabular-nums"
                      value={amount}
                      onChange={(event) => setAmount(event.target.value)}
                    />
                  </div>
                </div>

                <PaymentMethodPicker value={method} onChange={setMethod} />

                {split ? (
                  <SplitAmounts total={total} cash={cash} onCashChange={setCash} idPrefix={`fix-split-${id}`} />
                ) : null}

                <div className="space-y-1.5">
                  <Label htmlFor={`fix-day-${id}`}>Día del cobro</Label>
                  <Input
                    id={`fix-day-${id}`}
                    type="date"
                    max={today}
                    className="h-12 text-base tabular-nums"
                    value={paidOn}
                    onChange={(event) => setPaidOn(event.target.value)}
                  />
                  <p className="text-muted-foreground text-xs">
                    Es el día en que entra en Caja. Cambialo si lo cobraste otro día.
                  </p>
                </div>
              </div>

              <DialogFooter className="flex-col gap-2 sm:flex-col">
                <Button
                  size="touch-xl"
                  disabled={
                    pending ||
                    !amount ||
                    !paidOn ||
                    paidOn > today ||
                    (split && (Number(cash) || 0) > total)
                  }
                  onClick={function run() {
                    startTransition(async () => {
                      const ok = await runCorrection(
                        () =>
                          correctPayment(id, {
                            amount: total,
                            method: split ? "efectivo" : method,
                            cash: split ? cashValue : undefined,
                            paidOn,
                          }),
                        "No se pudo corregir el cobro.",
                        run,
                      );
                      if (ok) setOpen(false);
                    });
                  }}
                >
                  {pending ? "Guardando…" : "Guardar corrección"}
                </Button>
                <Button
                  variant="ghost"
                  size="touch-lg"
                  className="text-destructive hover:text-destructive"
                  disabled={pending}
                  onClick={() => setConfirmUndo(true)}
                >
                  <Undo2 className="size-4" />
                  Deshacer cobro
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
