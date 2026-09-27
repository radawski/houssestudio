"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { deleteService, toggleServiceActive } from "@/lib/actions/services";
import type { Service } from "@/lib/supabase/database.types";
import { toastActionError } from "@/lib/toast-error";

/**
 * `size="lg"` es el switch táctil de la tarjeta mobile: dibuja 44×26 y su
 * área táctil llega a 48×44 (design/admin-iphone n-Servicios).
 */
export function ServiceVisibilityToggle({
  service,
  size,
}: {
  service: Service;
  size?: "default" | "lg";
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Switch
      size={size}
      checked={service.is_active}
      disabled={pending}
      aria-label={`Mostrar ${service.name} en el portal público`}
      onCheckedChange={function run(checked: boolean) {
        startTransition(async () => {
          try {
            await toggleServiceActive(service.id, checked);
            toast.success(checked ? "Servicio visible." : "Servicio oculto.");
          } catch (error) {
            toastActionError(error, "No se pudo cambiar la visibilidad.", () => run(checked));
          }
        });
      }}
    />
  );
}

export function ServiceDeleteButton({ service }: { service: Service }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="icon-touch"
      className="md:size-8"
      disabled={pending}
      onClick={() => {
        // Los turnos ya tomados conservan nombre y precio propios, asi que
        // borrar el servicio no altera el historico ni los reportes.
        if (!confirm(`¿Eliminar "${service.name}" del catálogo?`)) return;

        const remove = () =>
          startTransition(async () => {
            try {
              await deleteService(service.id);
              toast.success("Servicio eliminado.");
            } catch (error) {
              toastActionError(error, "No se pudo eliminar el servicio.", remove);
            }
          });
        remove();
      }}
    >
      <Trash2 className="text-destructive size-4" />
      <span className="sr-only">Eliminar {service.name}</span>
    </Button>
  );
}
