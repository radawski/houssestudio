"use client";

import { LoadError } from "@/components/admin/load-error";

export default function ServiciosError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <LoadError
      title="No pudimos cargar los servicios."
      saved="El catálogo está guardado"
      error={error}
      retry={retry}
    />
  );
}
