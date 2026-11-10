"use client";

import { LoadError } from "@/components/admin/load-error";

export default function EstadisticasError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <LoadError
      title="No pudimos cargar las estadísticas."
      saved="Los turnos y los cobros están guardados"
      error={error}
      retry={retry}
    />
  );
}
