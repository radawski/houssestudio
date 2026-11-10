"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  CorrectPaymentButton,
  PaymentMethodPicker,
  SplitAmounts,
  type PaymentChoice,
} from "@/components/admin/appointment-actions";
import { WalkInSaleButton, type SaleDraft } from "@/components/admin/walk-in-sale-button";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { correctWalkInSalePayment, voidWalkInSale } from "@/lib/actions/sales";
import type { ActionState } from "@/lib/actions/result";
import { describePayment, summarizeCharges } from "@/lib/cashbox";
import type { CashboxMovement } from "@/lib/data/cashbox";
import type { SaleCatalog } from "@/lib/data/products";
import { formatCurrency, formatTime } from "@/lib/format";
import { toastActionError, toastError } from "@/lib/toast-error";
import { cn } from "@/lib/utils";

/**
 * Corregir un movimiento desde Caja (tasks/plan-correcciones-cobros.md).
 *
 * - Cobro de un turno: abre el mismo "Corregir cobro" de la ficha del turno.
 * - Ítem de una venta suelta: abre la hoja "Venta" con todos los ítems de esa
 *   venta (se corrigen juntos), para cambiar el medio de pago, anularla, o
 *   anularla y volver a cargarla con los datos ya puestos.
 *
 * `children` es lo que se ve de la fila; el componente lo envuelve en el
 * disparador.
 */
export function MovementCorrection({
  movement,
  movements,
  catalog,
  className,
  children,
}: {
  movement: CashboxMovement;
  /** Todos los movimientos del día, para juntar los ítems de una misma venta. */
  movements: CashboxMovement[];
  catalog: SaleCatalog;
  className?: string;
  children: React.ReactNode;
}) {
  const correction = movement.correction;

  if (correction.kind === "turno") {
    return (
      <CorrectPaymentButton
        id={correction.appointmentId}
        payment={{
          amount: movement.amount,
          method: movement.method,
          cash_amount: movement.split?.efectivo ?? null,
          transfer_amount: movement.split?.transferencia ?? null,
          paid_at: movement.at,
        }}
        clientName={correction.clientName ?? undefined}
        serviceName={movement.serviceName}
        startsAt={correction.startsAt ?? undefined}
        triggerClassName={cn("w-full text-left", className)}
      >
        {children}
      </CorrectPaymentButton>
    );
  }

  const saleId = correction.saleId;
  const items = movements.filter((m) => m.correction.kind === "venta" && m.correction.saleId === saleId);
  return (
    <SaleSheet saleId={saleId} items={items} catalog={catalog} className={className}>
      {children}
    </SaleSheet>
  );
}

type SaleMode = "detalle" | "medio" | "anular";

function SaleSheet({
  saleId,
  items,
  catalog,
  className,
  children,
}: {
  saleId: string;
  items: CashboxMovement[];
  catalog: SaleCatalog;
  className?: string;
  children: React.ReactNode;
}) {
  const { total, byMethod } = summarizeCharges(items);
  const wasSplit = byMethod.efectivo > 0 && byMethod.transferencia > 0;
  const currentMethod: PaymentChoice = wasSplit ? "dividido" : byMethod.transferencia > 0 ? "transferencia" : "efectivo";

  const [open, setOpen] = useState(false);
  const [reloadOpen, setReloadOpen] = useState(false);
  const [mode, setMode] = useState<SaleMode>("detalle");
  const [method, setMethod] = useState<PaymentChoice>(currentMethod);
  const [cash, setCash] = useState(wasSplit ? String(byMethod.efectivo) : "");
  const [pending, startTransition] = useTransition();

  function openSheet() {
    setMode("detalle");
    setMethod(currentMethod);
    setCash(wasSplit ? String(byMethod.efectivo) : "");
    setOpen(true);
  }

  async function run(action: () => Promise<ActionState>, fallback: string, retry: () => void) {
    try {
      const result = await action();
      if (result.status === "success") {
        toast.success(result.message ?? "Listo.");
        setOpen(false);
      } else {
        toastError(result.message ?? fallback);
      }
    } catch (error) {
      toastActionError(error, fallback, retry);
    }
  }

  // Lo que se vuelve a cargar: los ítems que siguen en el catálogo.
  const available = new Set([
    ...catalog.services.map((item) => `servicio:${item.id}`),
    ...catalog.categories.flatMap((category) => category.products.map((item) => `producto:${item.id}`)),
  ]);
  const draftItems = items.flatMap((item) =>
    item.correction.kind === "venta" &&
    item.correction.catalogId &&
    available.has(`${item.correction.itemKind}:${item.correction.catalogId}`)
      ? [{ kind: item.correction.itemKind, id: item.correction.catalogId, quantity: item.quantity }]
      : [],
  );
  const draft: SaleDraft = {
    saleId,
    items: draftItems,
    method: currentMethod,
    cash: wasSplit ? String(byMethod.efectivo) : "",
    note: items[0]?.note ?? "",
    missing: items.length - draftItems.length,
  };

  const split = method === "dividido";
  const cashValue = Math.min(Math.max(Number(cash) || 0, 0), total);
  const when = items[0] ? formatTime(items[0].at) : "";

  return (
    <>
      <button type="button" className={cn("w-full text-left", className)} onClick={openSheet}>
        {children}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{mode === "anular" ? "Anular venta" : mode === "medio" ? "Cambiar medio de pago" : "Venta suelta"}</DialogTitle>
            <DialogDescription>
              {mode === "anular"
                ? `Se borra la venta entera (${formatCurrency(total)}) y sale de Caja. No se puede volver atrás.`
                : `${when} · ${describePayment({ amount: total, method: currentMethod === "transferencia" ? "transferencia" : "efectivo", split: wasSplit ? byMethod : null }, formatCurrency)}`}
            </DialogDescription>
          </DialogHeader>

          <ul className="divide-y divide-[var(--hs-divider)] rounded-md border border-[var(--hs-border-card)]">
            {items.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-sm">
                <span className="min-w-0">
                  {item.concept}
                  {item.quantity > 1 ? <span className="text-muted-foreground"> × {item.quantity}</span> : null}
                </span>
                <span className="shrink-0 font-medium tabular-nums">{formatCurrency(item.amount)}</span>
              </li>
            ))}
            <li className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-sm font-semibold">
              <span>Total</span>
              <span className="tabular-nums">{formatCurrency(total)}</span>
            </li>
          </ul>

          {mode === "medio" ? (
            <div className="space-y-4">
              <PaymentMethodPicker value={method} onChange={setMethod} />
              {split ? (
                <SplitAmounts total={total} cash={cash} onCashChange={setCash} idPrefix={`sale-split-${saleId}`} />
              ) : null}
            </div>
          ) : null}

          <DialogFooter className="flex-col gap-2 sm:flex-col">
            {mode === "detalle" ? (
              <>
                <Button size="touch-lg" variant="outline" onClick={() => setMode("medio")}>
                  Cambiar medio de pago
                </Button>
                <Button
                  size="touch-lg"
                  variant="outline"
                  disabled={draftItems.length === 0}
                  onClick={() => {
                    setOpen(false);
                    setReloadOpen(true);
                  }}
                >
                  Anular y volver a cargar
                </Button>
                <Button
                  size="touch-lg"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setMode("anular")}
                >
                  Anular venta
                </Button>
              </>
            ) : mode === "medio" ? (
              <>
                <Button
                  size="touch-xl"
                  disabled={pending || (split && (Number(cash) || 0) > total)}
                  onClick={function retry() {
                    startTransition(() =>
                      run(
                        () =>
                          correctWalkInSalePayment({
                            saleId,
                            method: split ? "efectivo" : method,
                            cash: split ? cashValue : undefined,
                          }),
                        "No se pudo cambiar el medio de pago.",
                        retry,
                      ),
                    );
                  }}
                >
                  {pending ? "Guardando…" : "Guardar medio de pago"}
                </Button>
                <Button size="touch-lg" variant="ghost" disabled={pending} onClick={() => setMode("detalle")}>
                  Volver
                </Button>
              </>
            ) : (
              <>
                <Button
                  size="touch-xl"
                  className="bg-destructive hover:bg-destructive/90 text-white"
                  disabled={pending}
                  onClick={function retry() {
                    startTransition(() => run(() => voidWalkInSale(saleId), "No se pudo anular la venta.", retry));
                  }}
                >
                  {pending ? "Anulando…" : "Anular venta"}
                </Button>
                <Button size="touch-lg" variant="ghost" disabled={pending} onClick={() => setMode("detalle")}>
                  Volver
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {reloadOpen ? (
        <WalkInSaleButton
          catalog={catalog}
          initial={draft}
          open={reloadOpen}
          onOpenChange={setReloadOpen}
          withTriggers={false}
        />
      ) : null}
    </>
  );
}
