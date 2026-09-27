"use client";

import { LoadError } from "@/components/admin/load-error";

export default function AgendaError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <LoadError
      title="No pudimos cargar la agenda."
      saved="Tus turnos están guardados"
      error={error}
      retry={retry}
    />
  );
}
