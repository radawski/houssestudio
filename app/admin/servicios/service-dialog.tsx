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
import { toastActionError, toastError } from "@/lib/toast-error";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-destructive text-sm">{message}</p>;
}

/**
 * Crear o editar un servicio. `trigger` elige el disparador:
 * - `new`: botón "Nuevo servicio" en escritorio y FAB en mobile, el mismo
 *   diálogo (patrón de `WalkInSaleButton`). La acción primaria no vive en el
 *   header del celular, donde no llega el pulgar.
 * - `empty`: botón primario "+ Crear el primero" del estado vacío.
 * - sin `trigger` y con `service`: lápiz de la tarjeta, hoja precargada.
 */
export function ServiceDialog({
  service,
  trigger = "new",
}: {
  service?: Service;
  trigger?: "new" | "empty";
}) {
  const [open, setOpen] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>();
  const [pending, startTransition] = useTransition();

  // Se llama a la Server Action a mano en vez de con `useActionState` porque hay
  // que reaccionar al resultado (cerrar el diálogo, avisar). Hacerlo en un
  // efecto que observe el estado provocaría renders en cascada.
  function submit(formData: FormData) {
    startTransition(async () => {
      let result;
      try {
        result = await saveService(idleState, formData);
      } catch (error) {
        toastActionError(error, "No se pudo guardar el servicio.", () => submit(formData));
        return;
      }

      if (result.status === "success") {
        toast.success(result.message);
        setFieldErrors(undefined);
        setOpen(false);
        return;
      }

      setFieldErrors(result.fieldErrors);
      if (!result.fieldErrors) toastError(result.message ?? "No se pudo guardar el servicio.", () => submit(formData));
    });
  }

  const isEdit = Boolean(service);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {isEdit ? (
        <DialogTrigger asChild>
          <Button variant="ghost" size="icon-touch" className="md:size-8">
            <Pencil className="size-4" />
            <span className="sr-only">Editar {service?.name}</span>
          </Button>
        </DialogTrigger>
      ) : trigger === "empty" ? (
        <DialogTrigger asChild>
          <Button size="touch">
            <Plus className="size-4" />
            Crear el primero
          </Button>
        </DialogTrigger>
      ) : (
        <>
          <DialogTrigger asChild>
            <Button size="sm" className="hidden md:inline-flex">
              <Plus className="size-4" />
              Nuevo servicio
            </Button>
          </DialogTrigger>
          {/* FAB por encima de la tab bar: mismo cálculo que el de "Venta
              suelta" (84 = tab bar + 16 de aire). */}
          <DialogTrigger asChild>
            <Button
              size="touch-lg"
              className="fixed right-4 bottom-[84px] z-30 gap-2 rounded-full px-4.5 shadow-lg md:hidden"
            >
              <Plus className="size-[18px]" />
              Nuevo servicio
            </Button>
          </DialogTrigger>
        </>
      )}

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar servicio" : "Nuevo servicio"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Los cambios se ven al instante en el portal público."
              : "Se agrega al catálogo del portal público."}
          </DialogDescription>
        </DialogHeader>

        {/* `key` fuerza a React a recrear el formulario al reabrir el diálogo,
            de modo que no quede texto de una edición anterior. */}
        <form key={String(open)} action={submit} className="space-y-3.5">
          {service ? <input type="hidden" name="id" value={service.id} /> : null}

          <div className="space-y-1.5">
            <Label htmlFor="name">Nombre</Label>
            <Input
              id="name"
              name="name"
              defaultValue={service?.name}
              placeholder="Corte de pelo"
              className="h-12 text-base md:h-9 md:text-sm"
              required
            />
            <FieldError message={fieldErrors?.name} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              name="description"
              defaultValue={service?.description ?? ""}
              placeholder="Corte completo con lavado y peinado."
              className="h-[72px] min-h-0 resize-none p-3 text-base leading-[1.35] md:text-sm"
            />
            <FieldError message={fieldErrors?.description} />
          </div>

          <div className="flex gap-3">
            <div className="min-w-0 flex-1 space-y-1.5">
              <Label htmlFor="price">Precio</Label>
              <div className="relative">
                <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-base tabular-nums md:text-sm">
                  $
                </span>
                <Input
                  id="price"
                  name="price"
                  type="number"
                  min={0}
                  step={100}
                  inputMode="numeric"
                  defaultValue={service?.price ?? ""}
                  className="h-12 pl-[26px] text-base tabular-nums md:h-9 md:text-sm"
                  required
                />
              </div>
              <FieldError message={fieldErrors?.price} />
            </div>

            <div className="min-w-0 flex-1 space-y-1.5">
              <Label htmlFor="durationMinutes">Duración</Label>
              {/* Campo libre y no un `<select>`: el catálogo necesita
                  duraciones como 20 o 40 min que una lista fija no cubre. */}
              <div className="relative">
                <Input
                  id="durationMinutes"
                  name="durationMinutes"
                  type="number"
                  min={5}
                  max={480}
                  step={1}
                  inputMode="numeric"
                  defaultValue={service?.duration_minutes ?? 45}
                  className="h-12 pr-12 text-base tabular-nums md:h-9 md:text-sm"
                  required
                />
                <span className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-base md:text-sm">
                  min
                </span>
              </div>
              <FieldError message={fieldErrors?.durationMinutes} />
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 rounded-md border border-[var(--hs-border-card)] px-3.5 py-3">
            <Label htmlFor="isActive" className="block font-normal">
              <span className="block text-sm font-medium">Visible en el portal</span>
              <span className="text-muted-foreground block text-xs">
                Los clientes lo van a poder reservar.
              </span>
            </Label>
            <Switch
              id="isActive"
              name="isActive"
              size="lg"
              defaultChecked={service?.is_active ?? true}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              size="touch-lg"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button type="submit" size="touch-xl" disabled={pending}>
              {pending ? "Guardando…" : isEdit ? "Guardar cambios" : "Crear servicio"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
