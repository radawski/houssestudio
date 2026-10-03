"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { RotateCw, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/**
 * La sesión no se pudo cargar (n-MasError). El error se queda dentro de la
 * tarjeta: las filas de Más no dependen de este pedido y siguen andando. Un
 * error de pantalla completa bloquearía Servicios por no poder mostrar un mail.
 */
export function SessionError({ reason, at }: { reason: string; at: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Card role="alert">
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <TriangleAlert className="size-[18px]" strokeWidth={1.75} aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium">No pudimos cargar tu sesión.</p>
            <p className="text-muted-foreground mt-0.5 text-[13px] leading-snug">
              Revisá la conexión. Servicios, Productos y Disponibilidad siguen disponibles.
            </p>
          </div>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-[11px] text-[var(--hs-mist)] tabular-nums">
            {reason} · {at}
          </span>
          <Button
            variant="outline"
            size="touch"
            disabled={pending}
            onClick={() => startTransition(() => router.refresh())}
          >
            <RotateCw className="size-[18px]" strokeWidth={1.75} aria-hidden />
            {pending ? "Reintentando…" : "Reintentar"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
