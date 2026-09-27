"use client";

import { LoadError } from "@/components/admin/load-error";

export default function DisponibilidadError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <LoadError
      title="No pudimos cargar la disponibilidad."
      saved="Tu horario está guardado"
      error={error}
      retry={retry}
    />
  );
}
