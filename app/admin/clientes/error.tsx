"use client";

import { LoadError } from "@/components/admin/load-error";

export default function ClientesError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <LoadError
      title="No pudimos cargar los clientes."
      saved="Las fichas están guardadas"
      error={error}
      retry={retry}
    />
  );
}
