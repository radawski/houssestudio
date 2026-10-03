"use client";

import { useState, useTransition } from "react";
import { ChevronRight, UserPlus } from "lucide-react";
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
import { addCustomer } from "@/lib/actions/customers";
import { idleState } from "@/lib/actions/result";
import { toastActionError, toastError } from "@/lib/toast-error";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-destructive text-sm">{message}</p>;
}

const inputClass = "h-12 text-base md:h-9 md:text-sm";

/**
 * Fila "Agregar cliente" de Más y su hoja (decisión del usuario: una hoja, no
 * una página de clientes).
 *
 * Para el cliente con número de otra zona: la web lo frena y le arma un
 * WhatsApp con sus datos; el peluquero los copia acá y el cliente ya puede
 * reservar solo con su DNI. Sin foco automático al abrir, como todas las
 * hojas del panel.
 */
export function AddCustomerSheet() {
  const [open, setOpen] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>();
  const [pending, startTransition] = useTransition();

  // Igual que `ServiceDialog`: la acción se llama a mano para poder cerrar la
  // hoja y avisar con el resultado.
  function submit(formData: FormData) {
    startTransition(async () => {
      let result;
      try {
        result = await addCustomer(idleState, formData);
      } catch (error) {
        toastActionError(error, "No se pudo guardar el cliente.", () => submit(formData));
        return;
      }

      if (result.status === "success") {
        toast.success(result.message);
        setFieldErrors(undefined);
        setOpen(false);
        return;
      }

      setFieldErrors(result.fieldErrors);
      if (!result.fieldErrors) toastError(result.message ?? "No se pudo guardar el cliente.", () => submit(formData));
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setFieldErrors(undefined);
      }}
    >
      <DialogTrigger asChild>
        <button
          type="button"
          className="hover:bg-accent flex h-15 w-full items-center gap-3 px-4 text-left transition-colors"
        >
          <UserPlus className="text-muted-foreground size-5 shrink-0" strokeWidth={1.75} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Agregar cliente</p>
            <p className="text-muted-foreground text-xs">Para quien tiene un número de otra zona.</p>
          </div>
          <ChevronRight className="text-muted-foreground size-4.5 shrink-0" />
        </button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Agregar cliente</DialogTitle>
          <DialogDescription>
            Con su ficha cargada reserva desde la web con su DNI, sin importar la zona del teléfono.
          </DialogDescription>
        </DialogHeader>

        {/* `key`: al reabrir la hoja arranca vacía. `onSubmit` y no `action`:
            React vacía el formulario al terminar una `action`, y con un error
            se perdía todo lo cargado, no solo el campo a corregir. */}
        <form
          key={String(open)}
          onSubmit={(event) => {
            event.preventDefault();
            submit(new FormData(event.currentTarget));
          }}
          className="space-y-3.5"
        >
          <div className="space-y-1.5">
            <Label htmlFor="customer-dni">DNI</Label>
            <Input
              id="customer-dni"
              name="dni"
              inputMode="numeric"
              autoComplete="off"
              placeholder="30123456"
              className={inputClass}
              required
              aria-invalid={Boolean(fieldErrors?.dni)}
            />
            <FieldError message={fieldErrors?.dni} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="customer-name">Nombre y apellido</Label>
            <Input
              id="customer-name"
              name="fullName"
              autoComplete="off"
              className={inputClass}
              required
              aria-invalid={Boolean(fieldErrors?.fullName)}
            />
            <FieldError message={fieldErrors?.fullName} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="customer-phone">Teléfono / WhatsApp</Label>
            <Input
              id="customer-phone"
              name="phone"
              type="tel"
              autoComplete="off"
              placeholder="11 2345-6789"
              className={inputClass}
              required
              aria-invalid={Boolean(fieldErrors?.phone)}
            />
            <FieldError message={fieldErrors?.phone} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="customer-email">
              Email <span className="text-muted-foreground font-normal">(opcional)</span>
            </Label>
            <Input
              id="customer-email"
              name="email"
              type="email"
              autoComplete="off"
              className={inputClass}
              aria-invalid={Boolean(fieldErrors?.email)}
              aria-describedby="customer-email-hint"
            />
            <p id="customer-email-hint" className="text-muted-foreground text-xs">
              Sin email no recibe ningún mail: ni confirmaciones ni recordatorios.
            </p>
            <FieldError message={fieldErrors?.email} />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" size="touch-lg" onClick={() => setOpen(false)} disabled={pending}>
              Cancelar
            </Button>
            <Button type="submit" size="touch-xl" disabled={pending}>
              {pending ? "Guardando…" : "Agregar cliente"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
