"use client";

import { useState, useTransition } from "react";
import { Plus, ShoppingBag } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { idleState } from "@/lib/actions/result";
import { recordWalkInSale } from "@/lib/actions/sales";
import { formatCurrency } from "@/lib/format";
import type { PaymentMethod, WalkInSaleKind } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";
import { toastActionError, toastError } from "@/lib/toast-error";

type ServiceOption = { id: string; name: string; price: number };

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-destructive text-sm">{message}</p>;
}

/**
 * Para una venta sin turno reservado: un corte que entra de pasada o un
 * producto (cera, bebida...). El producto no sale del catálogo: se escribe
 * su nombre y el monto arranca vacío.
 *
 * `serviceId` y `method` van por un input oculto que refleja el estado del
 * `Select` en vez de confiar en su prop `name` para participar del
 * `FormData` — mismo mecanismo que el switch de horario partido y el motivo
 * de la cancelación admin, para no depender de un detalle de Radix que este
 * componente no necesita verificar.
 */
export function WalkInSaleButton({ services }: { services: ServiceOption[] }) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<WalkInSaleKind>("servicio");
  const [serviceId, setServiceId] = useState("");
  const [productName, setProductName] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("efectivo");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>();
  const [pending, startTransition] = useTransition();

  function handleServiceChange(id: string) {
    setServiceId(id);
    const service = services.find((s) => s.id === id);
    if (service) setAmount(String(service.price));
  }

  function changeKind(next: WalkInSaleKind) {
    if (next === kind) return;
    setKind(next);
    setServiceId("");
    setProductName("");
    setAmount("");
    setFieldErrors(undefined);
  }

  function reset() {
    setKind("servicio");
    setServiceId("");
    setProductName("");
    setAmount("");
    setMethod("efectivo");
    setFieldErrors(undefined);
  }

  function submit(formData: FormData) {
    startTransition(async () => {
      let result;
      try {
        result = await recordWalkInSale(idleState, formData);
      } catch (error) {
        toastActionError(error, "No se pudo registrar la venta.", () => submit(formData));
        return;
      }

      if (result.status === "success") {
        toast.success(result.message);
        setOpen(false);
        reset();
        return;
      }

      setFieldErrors(result.fieldErrors);
      if (!result.fieldErrors) toastError(result.message ?? "No se pudo registrar la venta.", () => submit(formData));
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="hidden md:inline-flex">
          <ShoppingBag className="size-4" />
          Venta suelta
        </Button>
      </DialogTrigger>

      {/* FAB (design/admin-iphone n-Agenda): mismo diálogo, disparador propio
          para mobile, fijo por encima de la tab bar inferior. 84 = alto de
          la tab bar (6 + 56 + 6) + 16 de aire; sin `env()` porque el layout
          no usa `viewportFit: "cover"` y en Safari vale 0 igual. */}
      <DialogTrigger asChild>
        <Button
          size="touch-lg"
          className="fixed right-4 bottom-[84px] z-30 gap-2 rounded-full px-4.5 shadow-lg md:hidden"
        >
          <Plus className="size-[18px]" />
          Venta suelta
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar venta suelta</DialogTitle>
          <DialogDescription>
            Un corte que entró sin turno reservado, o un producto.
          </DialogDescription>
        </DialogHeader>

        <form action={submit} className="space-y-4">
          <input type="hidden" name="kind" value={kind} />
          <input type="hidden" name="method" value={method} />

          <div role="group" aria-label="Qué se vendió" className="bg-muted flex gap-0.5 rounded-md p-0.5">
            {(["servicio", "producto"] as const).map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={kind === option}
                onClick={() => changeKind(option)}
                className={cn(
                  "h-9 flex-1 rounded text-sm capitalize transition-colors",
                  kind === option
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {option}
              </button>
            ))}
          </div>

          {kind === "servicio" ? (
            <div className="space-y-2">
              <input type="hidden" name="serviceId" value={serviceId} />
              <Label htmlFor="walkin-service">Servicio</Label>
              <Select value={serviceId} onValueChange={handleServiceChange}>
                <SelectTrigger id="walkin-service" className="w-full">
                  <SelectValue placeholder="Elegí un servicio" />
                </SelectTrigger>
                <SelectContent>
                  {services.map((service) => (
                    <SelectItem key={service.id} value={service.id}>
                      {service.name} · {formatCurrency(service.price)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError message={fieldErrors?.serviceId} />
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="walkin-product">Producto</Label>
              <Input
                id="walkin-product"
                name="productName"
                placeholder="Cera, bebida…"
                maxLength={80}
                autoComplete="off"
                value={productName}
                onChange={(event) => setProductName(event.target.value)}
                required
              />
              <FieldError message={fieldErrors?.productName} />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="walkin-amount">Monto</Label>
            <Input
              id="walkin-amount"
              name="amount"
              type="number"
              min={0}
              step={100}
              inputMode="numeric"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              required
            />
            <FieldError message={fieldErrors?.amount} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="walkin-method">Medio de pago</Label>
            <Select value={method} onValueChange={(value) => setMethod(value as PaymentMethod)}>
              <SelectTrigger id="walkin-method" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="efectivo">Efectivo</SelectItem>
                <SelectItem value="transferencia">Transferencia</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="walkin-note">Nota (opcional)</Label>
            <Textarea id="walkin-note" name="note" rows={2} />
            <FieldError message={fieldErrors?.note} />
          </div>

          <DialogFooter>
            <Button
              type="submit"
              disabled={pending || (kind === "servicio" ? !serviceId : !productName.trim())}
            >
              {pending ? "Guardando…" : "Registrar venta"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
