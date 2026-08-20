"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { deleteService, toggleServiceActive } from "@/lib/actions/services";
import type { Service } from "@/lib/supabase/database.types";

export function ServiceVisibilityToggle({ service }: { service: Service }) {
  const [pending, startTransition] = useTransition();

  return (
    <Switch
      checked={service.is_active}
      disabled={pending}
      aria-label={`Mostrar ${service.name} en el portal público`}
      onCheckedChange={(checked) =>
        startTransition(async () => {
          try {
            await toggleServiceActive(service.id, checked);
            toast.success(checked ? "Servicio visible." : "Servicio oculto.");
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "No se pudo actualizar.");
          }
        })
      }
    />
  );
}

export function ServiceDeleteButton({ service }: { service: Service }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() => {
        // Los turnos ya tomados conservan nombre y precio propios, asi que
        // borrar el servicio no altera el historico ni los reportes.
        if (!confirm(`¿Eliminar "${service.name}" del catálogo?`)) return;

        startTransition(async () => {
          try {
            await deleteService(service.id);
            toast.success("Servicio eliminado.");
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "No se pudo eliminar.");
          }
        });
      }}
    >
      <Trash2 className="text-destructive size-4" />
      <span className="sr-only">Eliminar {service.name}</span>
    </Button>
  );
}
