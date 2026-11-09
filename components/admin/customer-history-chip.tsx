import { CircleAlert } from "lucide-react";

import { formatInTz } from "@/lib/format";
import { isFirstVisit, noShowCountLabel, type CustomerHistory } from "@/lib/no-shows";
import { cn } from "@/lib/utils";

/**
 * Aviso de faltas de un cliente (plan de noviembre, V2): "Faltó 2 veces ·
 * última 14/10", en rojo suave para no confundirse con el ámbar de
 * "Pendiente". Con `showFirstVisit`, a quien nunca vino le muestra "Primera
 * vez" (en Solicitudes, para decidir si aceptar).
 *
 * Solo tiene sentido en turnos que todavía no pasaron (pendientes o
 * confirmados): en uno ya resuelto el aviso hablaría de ese mismo turno.
 */
export function CustomerHistoryChip({
  history,
  showFirstVisit = false,
  className,
}: {
  history: CustomerHistory | null | undefined;
  showFirstVisit?: boolean;
  className?: string;
}) {
  const label = noShowCountLabel(history);

  if (label && history?.lastNoShowAt) {
    return (
      <span
        className={cn(
          "inline-flex h-6 w-fit items-center gap-1.5 rounded-full border border-[#f3c9c4] bg-[#fdeeec] px-2.5 text-xs font-medium text-[#9a2a22] tabular-nums",
          className,
        )}
      >
        <CircleAlert className="size-3.5" strokeWidth={2} aria-hidden />
        {label} · última {formatInTz(history.lastNoShowAt, "d/M")}
      </span>
    );
  }

  if (showFirstVisit && isFirstVisit(history)) {
    return (
      <span
        className={cn(
          "inline-flex h-6 w-fit items-center rounded-full border border-[var(--hs-mist)] px-2.5 text-xs font-medium",
          className,
        )}
      >
        Primera vez
      </span>
    );
  }

  return null;
}
