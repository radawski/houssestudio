import type { AppointmentStatus } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";

/**
 * Badge de estado del panel admin (design/admin-iphone n-estados): monocromo
 * salvo "Pendiente", el unico que todavia necesita accion del barbero y por
 * eso se mantiene en ambar. Vive aparte de `STATUS_META` en `lib/status.ts`,
 * que pinta el portal publico con su propia paleta de colores — ese archivo
 * queda fuera del alcance de este rediseño (solo el panel admin).
 */
const ADMIN_STATUS_BADGE: Record<
  AppointmentStatus,
  { label: string; badge: string; dot: string }
> = {
  pendiente: {
    label: "Pendiente",
    badge: "border-amber-200 bg-amber-100 text-amber-900",
    dot: "bg-amber-700",
  },
  confirmado: {
    label: "Confirmado",
    badge: "border-[var(--hs-mist)] bg-popover text-foreground",
    dot: "bg-foreground",
  },
  completado: {
    label: "Completado",
    badge: "border-[var(--hs-mist)] bg-popover text-muted-foreground",
    dot: "bg-muted-foreground",
  },
  cancelado: {
    label: "Cancelado",
    badge: "border-[var(--hs-border-card)] bg-background text-muted-foreground",
    dot: "bg-[var(--hs-mist)]",
  },
  no_show: {
    label: "No asistió",
    badge: "border-[var(--hs-border-card)] bg-background text-muted-foreground",
    dot: "bg-[var(--hs-mist)]",
  },
};

export function AdminStatusBadge({
  status,
  className,
}: {
  status: AppointmentStatus;
  className?: string;
}) {
  const meta = ADMIN_STATUS_BADGE[status];

  return (
    <span
      className={cn(
        "inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium",
        meta.badge,
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", meta.dot)} />
      {meta.label}
    </span>
  );
}
