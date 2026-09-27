"use client";

import { LoadError } from "@/components/admin/load-error";

export default function SolicitudesError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <LoadError
      title="No pudimos cargar las solicitudes."
      saved="Las reservas están guardadas"
      error={error}
      retry={retry}
    />
  );
}
