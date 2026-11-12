# Pruebas de carga del flujo de reserva

Simulan muchos clientes reservando al mismo tiempo. Corren contra un proyecto
de Supabase **de prueba**, nunca contra el de producción: `entorno.mjs` corta
si `.env.loadtest` apunta a la misma URL que `.env.local`.

## Preparar (una sola vez)

1. Crear un proyecto gratis en Supabase, en la misma región que producción.
2. En su SQL Editor, correr las migraciones de `supabase/migrations` en **dos
   tandas**: `0001`–`0013` y después `0014`–`0018`. Juntas fallan, porque la
   0014 usa un valor de enum que agrega la 0013, y Postgres no permite usarlo
   en la misma transacción.
3. Completar `.env.loadtest` (ignorado por git):
   `LOADTEST_SUPABASE_URL`, `LOADTEST_SUPABASE_ANON_KEY` (publishable) y
   `LOADTEST_SUPABASE_SERVICE_ROLE_KEY` (secret).
4. `node scripts/carga/preparar-copia.mjs`: copia servicios, horarios, ajustes
   y bloqueos de producción. De producción solo lee; nunca copia clientes ni
   turnos.

## Correr

Compilar y servir la app apuntada a la base de prueba, con los mails apagados
(`RESEND_API_KEY` vacía: los envíos fallan antes de llamar a Resend y quedan
en `email_log` como error):

```bash
NEXT_PUBLIC_SUPABASE_URL=<url prueba> NEXT_PUBLIC_SUPABASE_ANON_KEY=<publishable> \
SUPABASE_SERVICE_ROLE_KEY=<secret> RESEND_API_KEY= NEXT_PUBLIC_SITE_URL=http://localhost:3100 \
npx next build && <mismas variables> npx next start -p 3100
```

Hay que compilar con esas variables (no alcanza con pasarlas al `start`): las
`NEXT_PUBLIC_*` quedan grabadas en el build. **Al terminar, volver a correr
`npx next build` sin ellas**, para que `.next` vuelva a apuntar a producción.

```bash
node scripts/carga/carga.mjs recorrido --vus 100 --duracion 45 --base http://localhost:3100
node scripts/carga/carga.mjs estampida --vus 100 --dia 2026-12-23 --base http://localhost:3100
node scripts/carga/verificar.mjs            # turnos por día y solapes
node scripts/carga/verificar.mjs --vaciar   # vacía la base de prueba entre corridas
```

Escenarios: `portada`, `lecturas`, `dni`, `recorrido` (cliente real con
pausas) y `estampida` (todos en el mismo segundo por un día recién
habilitado). `--misma-ip` simula muchos clientes detrás de una misma IP
pública. Cada corrida guarda su resumen en `resultados/` (ignorada por git).

Los IDs de las Server Actions salen de `.next/server/server-reference-manifest.json`
y cambian con cada build: el script los lee solo, pero tiene que correr contra
el mismo build que está sirviendo.
