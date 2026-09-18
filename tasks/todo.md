# Todo — Módulo 2: autogestion-cancelacion

- [x] T1 — Helper puro de ventana (`lib/cancellation.ts` + test)
- [x] T2 — Server Action `cancelByToken` (rate limit, ventana en el UPDATE,
      `lib/cache.ts`, `cancelByTokenSchema`, código `fuera_de_ventana`)
- [x] T3 — UI en `/turno/[token]` (gating + botón + salida a WhatsApp)
- [x] Checkpoint final: `npm run typecheck && npm test && npm run build` +
      prueba manual real de ambas ramas (dentro y fuera de ventana) — la
      rama fuera de ventana falló en el primer intento (el bloque entero se
      ocultaba en vez de mostrar la salida a WhatsApp) y quedó corregida
