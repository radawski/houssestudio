/**
 * La tarea diaria (`/api/cron/reminders`) corre varios trabajos: el
 * recordatorio del día anterior y el recordatorio para volver. Cada uno va
 * aislado: si uno falla (por ejemplo, no puede leer la base), el otro corre
 * igual, y el resumen que queda en los logs de Vercel dice cuál falló.
 */
export async function runIsolated<T extends object>(
  name: string,
  job: () => Promise<T>,
): Promise<T | { error: string }> {
  try {
    return await job();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Falló el trabajo "${name}" de la tarea diaria: ${message}`);
    return { error: message };
  }
}
