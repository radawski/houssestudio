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
import type { PaymentMethod } from "@/lib/supabase/database.types";

type ServiceOption = { id: string; name: string; price: number };

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-destructive text-sm">{message}</p>;
}

/**
 * Para un corte que entra sin turno reservado.
 *
 * `serviceId` y `method` van por un input oculto que refleja el estado del
 * `Select` en vez de confiar en su prop `name` para participar del
 * `FormData` — mismo mecanismo que el switch de horario partido y el motivo
 * de la cancelación admin, para no depender de un detalle de Radix que este
 * componente no necesita verificar.
 */
export function WalkInSaleButton({ services }: { services: ServiceOption[] }) {
  const [open, setOpen] = useState(false);
  const [serviceId, setServiceId] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("efectivo");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>();
  const [pending, startTransition] = useTransition();

  function handleServiceChange(id: string) {
    setServiceId(id);
    const service = services.find((s) => s.id === id);
    if (service) setAmount(String(service.price));
  }

  function reset() {
    setServiceId("");
    setAmount("");
    setMethod("efectivo");
    setFieldErrors(undefined);
  }

  function submit(formData: FormData) {
    startTransition(async () => {
      const result = await recordWalkInSale(idleState, formData);

      if (result.status === "success") {
        toast.success(result.message);
        setOpen(false);
        reset();
        return;
      }

      setFieldErrors(result.fieldErrors);
      if (!result.fieldErrors) toast.error(result.message);
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
          para mobile, fijo por encima de la tab bar inferior. */}
      <DialogTrigger asChild>
        <Button
          size="touch-lg"
          className="fixed right-4 bottom-[calc(78px+max(env(safe-area-inset-bottom),22px))] z-30 gap-2 rounded-full px-4.5 shadow-lg md:hidden"
        >
          <Plus className="size-[18px]" />
          Venta suelta
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar venta suelta</DialogTitle>
          <DialogDescription>Para un corte que entró sin turno reservado.</DialogDescription>
        </DialogHeader>

        <form action={submit} className="space-y-4">
          <input type="hidden" name="serviceId" value={serviceId} />
          <input type="hidden" name="method" value={method} />

          <div className="space-y-2">
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
            <Button type="submit" disabled={pending || !serviceId}>
              {pending ? "Guardando…" : "Registrar venta"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
