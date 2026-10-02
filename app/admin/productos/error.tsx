"use client";

import { LoadError } from "@/components/admin/load-error";

export default function ProductosError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <LoadError
      title="No pudimos cargar los productos."
      saved="El catálogo está guardado"
      error={error}
      retry={retry}
    />
  );
}
