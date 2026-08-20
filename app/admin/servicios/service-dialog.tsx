"use client";

import { useState, useTransition } from "react";
import { Pencil, Plus } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { saveService } from "@/lib/actions/services";
import { idleState } from "@/lib/actions/result";
import type { Service } from "@/lib/supabase/database.types";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-destructive text-sm">{message}</p>;
}

export function ServiceDialog({ service }: { service?: Service }) {
  const [open, setOpen] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>();
  const [pending, startTransition] = useTransition();

  // Se llama a la Server Action a mano en vez de con `useActionState` porque hay
  // que reaccionar al resultado (cerrar el diálogo, avisar). Hacerlo en un
  // efecto que observe el estado provocaría renders en cascada.
  function submit(formData: FormData) {
    startTransition(async () => {
      const result = await saveService(idleState, formData);

      if (result.status === "success") {
        toast.success(result.message);
        setFieldErrors(undefined);
        setOpen(false);
        return;
      }

      setFieldErrors(result.fieldErrors);
      if (!result.fieldErrors) toast.error(result.message);
    });
  }

  const isEdit = Boolean(service);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isEdit ? (
          <Button variant="ghost" size="sm">
            <Pencil className="size-4" />
            <span className="sr-only">Editar {service?.name}</span>
          </Button>
        ) : (
          <Button size="sm">
            <Plus className="size-4" />
            Nuevo servicio
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar servicio" : "Nuevo servicio"}</DialogTitle>
          <DialogDescription>
            La duración define los horarios que se ofrecen en el portal público.
          </DialogDescription>
        </DialogHeader>

        {/* `key` fuerza a React a recrear el formulario al reabrir el diálogo,
            de modo que no quede texto de una edición anterior. */}
        <form key={String(open)} action={submit} className="space-y-4">
          {service ? <input type="hidden" name="id" value={service.id} /> : null}

          <div className="space-y-2">
            <Label htmlFor="name">Nombre</Label>
            <Input id="name" name="name" defaultValue={service?.name} required />
            <FieldError message={fieldErrors?.name} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              name="description"
              rows={2}
              defaultValue={service?.description ?? ""}
            />
            <FieldError message={fieldErrors?.description} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="price">Precio (ARS)</Label>
              <Input
                id="price"
                name="price"
                type="number"
                min={0}
                step={100}
                inputMode="numeric"
                defaultValue={service?.price ?? 0}
                required
              />
              <FieldError message={fieldErrors?.price} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="durationMinutes">Duración (min)</Label>
              <Input
                id="durationMinutes"
                name="durationMinutes"
                type="number"
                min={5}
                max={480}
                step={5}
                inputMode="numeric"
                defaultValue={service?.duration_minutes ?? 45}
                required
              />
              <FieldError message={fieldErrors?.durationMinutes} />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Switch
              id="isActive"
              name="isActive"
              defaultChecked={service?.is_active ?? true}
            />
            <Label htmlFor="isActive" className="font-normal">
              Visible en el portal público
            </Label>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Guardando…" : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
