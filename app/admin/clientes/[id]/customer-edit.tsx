"use client";

import { useState, useTransition } from "react";
import { Pencil } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { updateCustomer, updateCustomerNotes } from "@/lib/actions/customers";
import { idleState } from "@/lib/actions/result";
import type { Customer } from "@/lib/supabase/database.types";
import { toastActionError, toastError } from "@/lib/toast-error";

const inputClass = "h-12 text-base md:h-9 md:text-sm";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-destructive text-sm">{message}</p>;
}

/**
 * "Editar datos" de la ficha: nombre, teléfono y email. El DNI no se edita
 * (es con lo que el cliente reserva y entra a "Mis turnos").
 */
export function EditCustomerSheet({
  customer,
}: {
  customer: Pick<Customer, "id" | "full_name" | "phone" | "email">;
}) {
  const [open, setOpen] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>();
  const [pending, startTransition] = useTransition();

  function submit(formData: FormData) {
    startTransition(async () => {
      let result;
      try {
        result = await updateCustomer(customer.id, idleState, formData);
      } catch (error) {
        toastActionError(error, "No se pudieron guardar los datos.", () => submit(formData));
        return;
      }
      if (result.status === "success") {
        toast.success(result.message);
        setFieldErrors(undefined);
        setOpen(false);
        return;
      }
      setFieldErrors(result.fieldErrors);
      if (!result.fieldErrors) toastError(result.message ?? "No se pudieron guardar los datos.");
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
        <Button variant="outline" size="touch" className="flex-1">
          <Pencil className="size-4" />
          Editar datos
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar datos</DialogTitle>
          <DialogDescription>El DNI no se cambia: es con lo que reserva desde la web.</DialogDescription>
        </DialogHeader>

        {/* `onSubmit` y no `action`: React vacía el formulario al terminar una
            `action`, y con un error se perdería lo editado. */}
        <form
          key={String(open)}
          onSubmit={(event) => {
            event.preventDefault();
            submit(new FormData(event.currentTarget));
          }}
          className="space-y-3.5"
        >
          <div className="space-y-1.5">
            <Label htmlFor="edit-name">Nombre y apellido</Label>
            <Input
              id="edit-name"
              name="fullName"
              defaultValue={customer.full_name}
              autoComplete="off"
              className={inputClass}
              required
              aria-invalid={Boolean(fieldErrors?.fullName)}
            />
            <FieldError message={fieldErrors?.fullName} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-phone">Teléfono / WhatsApp</Label>
            <Input
              id="edit-phone"
              name="phone"
              type="tel"
              defaultValue={customer.phone}
              autoComplete="off"
              className={inputClass}
              required
              aria-invalid={Boolean(fieldErrors?.phone)}
            />
            <FieldError message={fieldErrors?.phone} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-email">
              Email <span className="text-muted-foreground font-normal">(opcional)</span>
            </Label>
            <Input
              id="edit-email"
              name="email"
              type="email"
              defaultValue={customer.email ?? ""}
              autoComplete="off"
              className={inputClass}
              aria-invalid={Boolean(fieldErrors?.email)}
            />
            <FieldError message={fieldErrors?.email} />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" size="touch-lg" onClick={() => setOpen(false)} disabled={pending}>
              Cancelar
            </Button>
            <Button type="submit" size="touch-xl" disabled={pending}>
              {pending ? "Guardando…" : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Notas privadas del peluquero: se guardan con el botón, que aparece al editar. */
export function CustomerNotes({ id, initial }: { id: string; initial: string }) {
  const [notes, setNotes] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [pending, startTransition] = useTransition();
  const dirty = notes.trim() !== saved.trim();

  function save() {
    startTransition(async () => {
      try {
        const result = await updateCustomerNotes(id, notes);
        if (result.status === "success") {
          setSaved(notes);
          toast.success(result.message);
        } else {
          toastError(result.message ?? "No se pudieron guardar las notas.", save);
        }
      } catch (error) {
        toastActionError(error, "No se pudieron guardar las notas.", save);
      }
    });
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="customer-notes" className="text-muted-foreground text-[11px] font-medium tracking-[0.12em] uppercase">
        Notas
      </Label>
      <Textarea
        id="customer-notes"
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
        maxLength={1000}
        rows={3}
        placeholder="Ej.: degradé bajo, número 1 a los costados."
        className="bg-card min-h-[88px] text-base md:text-sm"
      />
      <div className="flex items-center justify-between gap-3">
        <p className="text-muted-foreground text-xs">Solo las ves vos.</p>
        {dirty ? (
          <Button size="sm" className="h-9 px-4" onClick={save} disabled={pending}>
            {pending ? "Guardando…" : "Guardar notas"}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
