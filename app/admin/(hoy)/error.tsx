"use client";

import { LoadError } from "@/components/admin/load-error";
import { formatLongDate } from "@/lib/format";

/**
 * Se conserva el h1 con la fecha (n-ErrorCarga): es dato del reloj, no del
 * servidor, así que se puede mostrar aunque haya fallado la consulta.
 */
export default function HoyError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <LoadError
      title="No pudimos cargar tu día."
      saved="Tus turnos están guardados"
      error={error}
      retry={retry}
    >
      <div>
        <h1 className="text-xl font-semibold first-letter:uppercase">
          {formatLongDate(new Date())}
        </h1>
        <p className="text-muted-foreground text-sm">Tu día de un vistazo.</p>
      </div>
    </LoadError>
  );
}
