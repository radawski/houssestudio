# Plan — Emails transaccionales con la estética de la web

Pedido del usuario: rediseñar los emails con la estética del sitio, a partir
de `Emails.dc.html`. Son 3 mails para el cliente (1a solicitud recibida,
1b confirmado, 1c cancelado), 2 para el peluquero (2a nueva solicitud,
2b turno cancelado) y el recordatorio, que usa el layout de 1b.

## Qué ya estaba planeado y qué no

- **Nada de esto figuraba en ningún plan.** La Fase 2 (`SPEC.md` §4.1) dejó
  los emails **solo en texto plano**, y el rediseño móvil (A–H) y las
  correcciones (T1–T6) no los tocaron.
- **El email 1b (confirmado) no existe.** `confirmAppointment` cambia el
  estado y no manda nada. Hoy el cliente se entera de la confirmación solo si
  entra a `/turno/[token]`.
- **El recordatorio es de la Fase 3** (`CRON_SECRET` reservado, tipo
  `recordatorio` en `email_type` con su índice de idempotencia). Este plan
  deja **el template** listo. El envío programado sigue en la Fase 3.

Por eso este trabajo entra como **fase propia, "Emails"**, entre el rediseño
móvil ya cerrado y la Fase 3. La Fase 3 queda igual, con una dependencia
nueva: sus recordatorios usan el template y el link de este plan.

## Hallazgos que condicionan el diseño

1. **El link "Ver mi turno" no se puede rearmar después de la reserva.**
   `appointments.manage_token_hash` guarda solo el sha256 del token. El token
   en claro existe únicamente dentro de `createBooking` (1a). En 1b (lo
   dispara el peluquero al aceptar), en el recordatorio (lo dispara el cron) y
   en 1c/2b cuando cancela el peluquero, no hay token para armar el link.
   **Decisión a confirmar**: ver "Decisiones".
2. **`public/logo.png` no tiene transparencia.** Es RGB, 914×1024: el glifo
   blanco sobre un **fondo negro puro (#000)**. Sobre el header `#050505`
   quedaría un recuadro apenas distinto, y algunos clientes con modo oscuro
   lo invierten. Hay que generar un PNG con alfa (blanco sobre transparente).
   `sharp` 0.35 ya está en `node_modules`, así que no hace falta instalar
   nada.
3. **El log de 1b necesita su propio tipo.** `email_type` tiene
   `confirmacion`, `cancelacion` y `recordatorio`, y hoy `confirmacion` se usa
   para 1a (la solicitud recibida). Se suma un valor para 1b, con una
   migración chica.
4. **`NEXT_PUBLIC_SITE_URL` en Vercel.** Los links y el logo usan
   `siteUrl()`, que vuelve a `http://localhost:3000` si la variable falta. Hay
   que confirmar que en Vercel valga `https://houssestudio.vercel.app`. Si no
   está cargada, el link de 1a ya hoy apunta a localhost en producción.
5. **Resend en sandbox.** Desde el dominio de prueba solo se puede enviar a
   la dirección dueña de la cuenta. Alcanza para probar los 6 mails en tu
   casilla. A clientes reales se llega recién con el dominio propio (ya
   previsto: es una variable de entorno).

## Tareas, en orden

### E1 — Base del layout y helpers (`lib/email/layout.ts`, puro)

- `escapeHtml()` para todo dato de usuario (nombre, motivo, servicio,
  teléfono).
- `formatCancellationWindow(hours)`:
  - `0` → "hasta el horario del turno";
  - `1` → "1 hora";
  - `n` → "{n} horas".
- Piezas maquetadas con `<table role="presentation">` y estilos inline, sin
  flex, grid, clases ni `mix-blend-mode`:
  - documento con `<meta viewport>`, fondo `#f4f5f7` y tarjeta
    `width:100%; max-width:600px` con borde `#dde0e4`;
  - preheader oculto;
  - header del cliente (logo 46px + "HOUSSESTUDIO" 20/500 + "PELUQUERÍA"
    11px, .28em, blanco al 55%) y header del panel (logo 28px +
    "HOUSSESTUDIO" / "PANEL");
  - badge (pendiente, confirmado o cancelado, con los colores pedidos);
  - título 26/300;
  - fecha 22/300 con el horario "14:30 – 15:15 h" en `#4a4f55`, tachada en
    los cancelados;
  - tabla de detalle (label 12px en mayúsculas `#4a4f55`, valor 15px a la
    derecha, filetes de 1px `#b8bdc3`);
  - botón "bulletproof" primario (`#111315`/`#f4f5f7`) y secundario (borde
    `#b8bdc3`), 48px, 13px en mayúsculas con .18em;
  - nota y footer (borde `#eceef1`, 12px `#4a4f55`).
- Tipografía `Roboto, Helvetica, Arial, sans-serif` y texto `#111315`.
- Tests: escape, la ventana (0, 1 y 2 o más), que no haya `display:flex` ni
  `class=`, preheader presente.

### E2 — Logo para email

- Script `scripts/generar-logo-email.mjs` con `sharp`. Convierte el negro a
  transparente usando la luminancia como alfa, y exporta
  `public/email/logo-92.png` y `public/email/logo-56.png` (el doble de 46 y
  de 28, para pantallas retina).
- En el `<img>`: URL absoluta `siteUrl() + "/email/logo-92.png"`, `width` y
  `height` fijos y `alt="HOUSSESTUDIO"`.
- Nota: el pedido decía `/logo.png`. Se usa una versión aparte porque la
  original no tiene transparencia, y la portada del sitio no cambia.

### E3 — Los cuatro mails que ya existen, en HTML + texto

- `EmailContent` pasa a `{ subject, html, text, preheader }`.
- Se mantienen las firmas y los datos actuales de `templates.ts`.
- **1a** "Turno solicitado": badge pendiente; detalle con servicio, precio y
  nombre; CTA primario "Seguir mi turno"; nota "Sin seña: pagás en el local.".
- **2a** "{cliente} pidió un turno": header del panel; detalle con servicio,
  precio y teléfono como `tel:`; CTA "Ver solicitudes". El pedido dice
  `/admin`; propongo `/admin/solicitudes`, que es donde se acepta.
- **1c** "Turno cancelado": fecha tachada; detalle con servicio y el motivo
  solo si existe; CTA secundario "Reservar otro turno" hacia `siteUrl()`.
- **2b**: "{cliente} canceló su turno" o "Cancelaste el turno de {cliente}",
  según quién canceló; subtítulo "El horario quedó libre en la agenda.";
  detalle con cliente, servicio y motivo; CTA secundario "Abrir agenda"
  hacia `/admin/agenda?vista=dia&fecha=<día>`.
- `send.ts`: manda `html` y `text` juntos. Los destinatarios no cambian
  (`adminEmail()` para 2a/2b).
- Tests nuevos en `templates.test.ts` por mail: título, detalle, CTA con la
  URL correcta, motivo opcional, escape de un nombre con `<script>`, y
  versión de texto con los mismos datos.

### E4 — Email 1b "¡Te esperamos!" al aceptar (depende de la decisión del link)

- Migración `0011`: `alter type email_type add value 'aceptacion'`. Se aplica
  solo después de confirmarla, como las anteriores.
- `confirmAppointment`: después del cambio de estado lee el turno (cliente,
  email, servicio, precio, horario) y `settings.cancellation_window_hours` en
  ese momento (igual que `app/turno/[token]/page.tsx`), y llama a
  `sendAppointmentConfirmed`, que nunca lanza, igual que los otros.
- Template: badge confirmado; mismo detalle que 1a; CTA "Ver mi turno"; nota
  "¿No podés venir? Cancelalo desde el mismo link hasta {N} antes." con
  `formatCancellationWindow`. Si la ventana es 0, la frase dice "hasta el
  horario del turno" sin "antes".
- Link: según la decisión.

### E5 — Template del recordatorio

- "Mañana te esperamos", con el layout de 1b y la misma nota y el mismo `N`.
- Solo el template y sus tests. El envío programado (cron + `CRON_SECRET`)
  sigue en la Fase 3.

### E6 — Preview en desarrollo

- Ruta `app/dev/emails/page.tsx`, que en producción responde 404
  (`notFound()` si `NODE_ENV === "production"`).
- Muestra los 6 mails con datos de ejemplo, cada uno en dos `iframe`
  (`srcDoc`) de 375px y 600px. Incluye un caso con motivo y otro sin motivo,
  y un nombre con caracteres especiales para ver el escape.
- Un link por mail para ver su versión en texto plano.

### E7 — Verificación

- La preview a 375px y 600px en Chrome.
- Un envío real de cada mail a tu casilla (Resend sandbox), abierto en Gmail
  (web y app del iPhone) y en Mail del iPhone. Si tenés Outlook a mano,
  también ahí.
- Typecheck, lint, tests y build.

## Decisiones confirmadas

- **Link fuera de la reserva: token derivado (a).** El token de los turnos
  nuevos se calcula como `HMAC(MANAGE_TOKEN_SECRET, id del turno)`; se sigue
  guardando solo su hash. Los turnos reservados antes del cambio conservan su
  link de 1a, y su 1b sale sin botón.
- **"Ver solicitudes"** lleva a `/admin/solicitudes`.
- **`Emails.dc.html`**: pendiente de que el usuario lo sume a `design/`; si no,
  se maqueta con la especificación del pedido.

## Decisiones que se consultaron (registro)

1. **Cómo armar el link de "Ver mi turno" fuera de la reserva** (1b y
   recordatorio).
   - **(a) Token derivado** (recomendado): el token deja de ser aleatorio y
     pasa a ser `HMAC(secreto, id del turno)`, con una variable nueva
     (`MANAGE_TOKEN_SECRET`). Se sigue guardando solo el hash, sin columnas
     nuevas, y cualquier envío puede recalcular el link. Los turnos ya
     reservados con el token viejo siguen funcionando, pero para esos no se
     puede rearmar el link: su 1b saldría sin botón.
   - **(b) Token cifrado en la base**: una columna nueva con el token cifrado
     con una clave del servidor. Funciona también para turnos nuevos, pero
     suma una columna y una clave que manejar.
   - **(c) Sin link en 1b ni en el recordatorio**: el cliente usa el link de
     1a. Es lo más simple, pero se pierde el CTA "Ver mi turno" que pide el
     diseño.
2. **`Emails.dc.html`**: no llegó adjunto. Con el texto del pedido alcanza
   para maquetar, pero para comparar píxel a píxel conviene sumarlo a
   `design/`.
3. **Destino de "Ver solicitudes"**: `/admin` (como dice el pedido) o
   `/admin/solicitudes` (propuesta).

## Resto del plan (sin cambios)

- **Fase 3**: solo recordatorios automáticos (decisión del usuario). Usan el
  template del recordatorio (E5) y el link derivado (E4).
- **A futuro, quizás**: CRM (ficha de cliente con historial y notas) y
  reportes (comparativas, servicios más vendidos, horarios pico, ausencias,
  clientes nuevos o recurrentes). Sin fecha ni especificación.
- **Fuera de alcance, a decidir aparte**: pago online, reprogramación de
  turnos, gastos de caja.
- **Pendientes sueltos**: dominio propio en Resend (una variable de
  entorno), y actualizar el estado en el README.
