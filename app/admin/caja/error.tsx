"use client";

import { LoadError } from "@/components/admin/load-error";

export default function CajaError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <LoadError
      title="No pudimos cargar la caja."
      saved="Tus cobros están guardados"
      error={error}
      retry={retry}
    />
  );
}
