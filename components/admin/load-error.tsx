"use client";

import { useEffect } from "react";
import { RotateCw, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatTime } from "@/lib/format";

/**
 * Tarjeta de error de carga de una pestaña del panel (design/admin-iphone
 * n-ErrorCarga), para los `error.tsx`. El header y la tab bar quedan en pie:
 * solo se reemplaza el contenido de `main`.
 *
 * Siempre hay una salida ("Reintentar", el `retry()` de Next, que vuelve a
 * pedir los datos) y se aclara que no se perdió nada. Abajo, en chico, el
 * identificador del error y la hora, para poder reportarlo.
 */
export function LoadError({
  title,
  saved,
  error,
  retry,
  children,
}: {
  /** "No pudimos cargar tu día." */
  title: string;
  /** Lo que sigue guardado: "Tus turnos están guardados". */
  saved: string;
  error: Error & { digest?: string };
  retry: () => void;
  /** Lo que se conserva arriba de la tarjeta (el h1 de Hoy con la fecha). */
  children?: React.ReactNode;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="space-y-6">
      {children}
      <div className="bg-card flex flex-col items-center gap-2 rounded-md border border-[var(--hs-border-card)] px-5 py-8 text-center">
        <span className="bg-destructive/10 flex size-12 items-center justify-center rounded-full">
          <TriangleAlert className="text-destructive size-6" strokeWidth={1.75} />
        </span>
        <p className="mt-1 text-[15px] font-medium">{title}</p>
        <p className="text-muted-foreground max-w-[258px] text-[13px]">
          Revisá la conexión y volvé a intentar. {saved}: no se perdió nada.
        </p>
        <Button size="touch" className="mt-2" onClick={() => retry()}>
          <RotateCw className="size-[18px]" />
          Reintentar
        </Button>
        <p className="mt-1 text-[11px] text-[var(--hs-mist)] tabular-nums">
          {error.digest ?? error.name} · {formatTime(new Date())}
        </p>
      </div>
    </div>
  );
}
