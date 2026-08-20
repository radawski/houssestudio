import "server-only";

/**
 * Límite de intentos en memoria, con ventana deslizante por clave.
 *
 * Protege la consulta pública de DNI: sin esto, alguien podría barrer números
 * de documento y usar el formulario como buscador de nombres, teléfonos y
 * mails ajenos.
 *
 * Vive en la memoria de la instancia de Next, no en la base. En Vercel cada
 * instancia (y cada arranque en frío) empieza en cero, así que esto encarece
 * el scraping por fuerza bruta pero no lo hace imposible. Si más adelante
 * importa de verdad, el reemplazo natural es una tabla de intentos en
 * Postgres, consultada desde el mismo lugar.
 */

type Bucket = { count: number; windowStart: number };

const buckets = new Map<string, Bucket>();

export function checkRateLimit(
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number },
): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now - bucket.windowStart >= windowMs) {
    buckets.set(key, { count: 1, windowStart: now });
    return true;
  }

  if (bucket.count >= limit) return false;

  bucket.count += 1;
  return true;
}
