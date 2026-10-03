# Plan — Mejoras de octubre: reserva, clientes de otra zona, estados de carga y recordatorio para volver

Fuentes de diseño:
- Botón de WhatsApp: https://claude.ai/artifact/Q3vSSwbtYQrSJoGoGPNnjN
  (`Main` = hoja del componente, `Reserva` = iPhone con la tarjeta abierta)
- Mail "Ya pasó un mes" (1d): https://claude.ai/artifact/56tKU1sg7Y3b4drgmcsaiL
- Estados de carga del panel: https://claude.ai/artifact/RxUpgEsxVEjb94W4qQu8za
  (22 artboards + nota "REGLAS DE CARGA")

Las tareas están ordenadas por riesgo y dependencias, no por el orden del
pedido. Cada fase cierra con una verificación del usuario en el iPhone.

## Lo que encontré en el código (y cambia el plan)

1. **Confirmar turno tarda porque espera los mails.** `createBooking` hace
   `await Promise.all([sendBookingConfirmation, sendNewRequestAlert])` antes
   del `redirect`: el cliente espera dos envíos a Resend. El indicador de
   carga es necesario igual, pero la causa se ataca mandando los mails con
   `after()` (`node_modules/next/dist/docs/01-app/03-api-reference/04-functions/after.md`).
   `useActionState` ya devuelve `isPending`; `StepShell` no lo usa.
2. **Clientes de otra zona: el bloqueo ya tiene salida.** Un cliente
   reconocido por DNI que no toca sus datos no pasa por el control de área
   (ni en `DniGate` ni en `createBooking`). Alcanza con que el peluquero cree
   la ficha (DNI, nombre, teléfono, email). **Pero** si el cliente toca
   "Editar mis datos" (por ejemplo, para corregir el email), vuelve a chocar
   con `isLocalPhone` aunque el teléfono sea el mismo. Hay que arreglarlo en
   los dos lados.
3. **Portada:** `BookingLanding` ya sabe retirarla (`hideHero`), pero su
   `scrollTo(0, 0)` solo es correcto cuando el stepper está arriba de todo
   (el camino del botón). Con scroll manual el visitante puede estar en
   cualquier punto debajo de la portada: hay que compensar
   `scrollY - altoDeLaPortada`, no volver a 0.
4. **Agenda y Caja bloquean todo, toolbar incluido.** Las dos páginas hacen
   `await getSaleCatalog()` y las consultas antes de pintar nada, y el
   `loading.tsx` de ruta no se vuelve a mostrar al cambiar solo `?vista=` o
   `?fecha=`. Además los `href` de ◀ ▶ salen del `dateKey` del servidor: dos
   toques seguidos durante una navegación pendiente caen en la misma fecha.
5. **Más** hace `getUser()` en el cuerpo de la página: si tarda, se congela
   todo, y si falla no hay error propio. `BackHeader` es un `<Link>` hacia
   adelante, por eso volver a Más recarga la sesión.
6. **"Completado" depende de cobrar.** Un turno pasa a `completado` solo al
   registrar el cobro (`lib/actions/appointments.ts`). Si en la práctica hay
   turnos atendidos que quedan en `confirmado`, el recordatorio de un mes no
   les llega. Se verifica con datos reales antes de V3.
7. **Enum nuevo en Postgres:** un valor agregado con `alter type … add value`
   no se puede usar en la misma transacción. Va solo en su migración (como
   0011) y el índice que lo usa, en la siguiente.

Nota de lectura del pedido: "volver de Servicios a la sección Productos /
Disponibilidad" lo tomo como **volver a Más desde Productos / Disponibilidad**,
que es lo que dibujan los artboards `MasVolverProductos` y
`MasVolverDisponibilidad`.

## Decisiones de arquitectura

- **WhatsApp:** el botón vive en el árbol de la página pública (`app/page.tsx`),
  no en el layout raíz, que también envuelve `/admin` y `/login`. Número de
  `settings.phone` con `toWhatsappNumber`; sin número, no se muestra.
  Cuadrado r4 de 56 px (valor por defecto del diseño). Tocarlo abre la
  tarjeta "¿Dudas con tu turno?" con "Abrir WhatsApp" (`components/ui/popover.tsx`).
  Blanco sobre la portada, tinta sobre el papel. Sin animación de entrada
  (Reducir movimiento).
- **Clientes de otra zona:** sin "lista blanca" nueva. La ficha creada por el
  peluquero es la excepción: si el teléfono que llega es el mismo que ya
  tiene la ficha de ese DNI, no se controla el área.
- **Estados de carga en Agenda/Caja:** el toolbar se calcula sin pedir datos
  y se pinta enseguida. Solo los datos van dentro de
  `<Suspense key={vista + fecha}>`. La fecha "pendiente" vive en el cliente
  (estado optimista), así título, tira, flechas y "Hoy" responden al toque y
  dos ▶ seguidos avanzan dos días. El spike L1 confirma el mecanismo contra
  la documentación de Next 16 antes de replicarlo.
- **Recordatorio para volver:** corre dentro del mismo cron diario de las
  10 h (`/api/cron/reminders`), aislado del recordatorio del día anterior (un
  fallo de uno no frena al otro). No se suma un segundo cron.
- **Idempotencia del recordatorio:** una fila en `email_log` de tipo nuevo
  `vuelta` con el `appointment_id` del último turno completado, más un índice
  único parcial. "Un recordatorio por ciclo" sale solo: si el cliente vuelve
  y se completa otro turno, el id cambia.
- **Darse de baja:** link con token derivado (HMAC de
  `MANAGE_TOKEN_SECRET` sobre `"unsubscribe:" + customerId`, igual que
  `lib/tokens.ts`) hacia una página con un botón que confirma. Nunca un GET
  que cambie datos: los antivirus del correo abren los links solos y darían
  de baja a la gente.

## Tareas

### Fase 1 — Reserva pública (bajo riesgo, independientes)

#### C1 — "Confirmar turno" muestra que está trabajando (S)
Al tocar "Confirmar turno" el botón pasa a "Confirmando…", queda
deshabilitado junto con "Volver" (`aria-busy`). Los mails se mandan con
`after()` para que el redirect no espere a Resend.

**Aceptación:**
- Desde el toque hasta "Turno solicitado" el botón muestra "Confirmando…" y
  no se puede tocar de nuevo (sin doble envío).
- Si la acción devuelve error, el botón vuelve a su estado normal con el
  mensaje.
- Los dos mails (1a al cliente y 2a al local) siguen llegando y quedan en
  `email_log`.

**Verificación:** `npm test`, `npm run typecheck`, `npm run lint`,
`npm run build`; en Chrome a 390 px, con red lenta (DevTools), reservar y ver
el estado; revisar `email_log`.

**Archivos:** `components/public/step-shell.tsx`,
`components/public/booking-stepper.tsx`, `lib/actions/booking.ts`.

#### C2 — "Volver al inicio" en Turno solicitado (XS)
Botón secundario debajo del detalle, solo en la variante `?nuevo=1`, que
lleva a `/`.

**Aceptación:** aparece en "Turno solicitado" y no en "Tu turno"; lleva a la
portada; alto táctil ≥ 44 px.

**Verificación:** build + Chrome a 390 px.

**Archivos:** `app/turno/[token]/page.tsx`.

#### C3 — Pasar la portada con el dedo la retira, igual que el botón (S)
Cuando el scroll manual termina con la portada fuera de pantalla, se llama a
`hideHero()` y se compensa el scroll (`scrollY - altoDeLaPortada`) para que
el contenido no salte. Ya no se puede volver a subir a la portada.

**Aceptación:**
- Bajar con el dedo hasta pasar la portada → al soltar, la portada
  desaparece y no se puede volver a ella; el stepper no salta.
- Si el dedo se detiene con la portada todavía visible, no pasa nada.
- El camino del botón "Reservar turno" sigue igual.

**Verificación:** build + Chrome a 390 px (rueda y arrastre). **Necesita la
prueba del usuario en el iPhone** (inercia del scroll de iOS).

**Archivos:** `components/public/booking-landing.tsx`,
`components/public/hero-cta.tsx` (reutilizar `onScrollEnd`).

#### C4 — Botón flotante de WhatsApp (S)
Botón 56×56 abajo a la derecha (`right 20`, `bottom 24` + safe area). Abre
la tarjeta con cierre (44×44) y "Abrir WhatsApp" (`wa.me/<número>`). Hover
grafito, foco con anillo pizarra, presionado escala .96 sin transición.
Variante blanca mientras la portada está detrás del botón. El stepper gana
relleno inferior (112 px en mobile) para que el botón no tape
"Continuar"/"Confirmar".

**Aceptación:**
- Visible en la portada y en los tres pasos; nunca tapa un botón del
  stepper.
- Sin `settings.phone`, no se muestra.
- `aria-label="Escribinos por WhatsApp"`, `aria-expanded`; la tarjeta se
  cierra con la X, con Escape y tocando afuera; no enfoca nada al abrir.

**Verificación:** build + Chrome a 390 y 1200 px; lector de pantalla
(VoiceOver) en el iPhone.

**Archivos:** `components/public/whatsapp-fab.tsx` (nuevo), `app/page.tsx`,
`components/public/booking-stepper.tsx` (relleno).

### Checkpoint 1 — Reserva pública
- [ ] Tests, typecheck, lint y build sin errores
- [ ] Usuario prueba en el iPhone: confirmar turno, volver al inicio, pasar
      la portada con el dedo, botón de WhatsApp

### Fase 2 — Clientes con número de otra zona

**Flujo resultante:** el cliente intenta reservar → ve "Coordinar por
WhatsApp" con un mensaje que ya trae nombre, DNI, teléfono y email → el
peluquero los carga en **Más → Agregar cliente** → le contesta "ya podés reservar" → el
cliente pone su DNI, la página lo reconoce y reserva sola, hoy y las próximas
veces.

#### Z1 — Si el teléfono es el de la ficha, no se vuelve a bloquear (S)
En `createBooking`, si el DNI ya tiene ficha y el teléfono normalizado que
llega es el mismo, no se controla el área. `DniGate` replica la regla (compara
contra `lookup.phone`) para no mostrar el aviso de otra zona.

**Aceptación:**
- Cliente con ficha de otra zona que edita solo su email → reserva sin aviso.
- El mismo cliente que cambia a otro número de otra zona → aviso, como hoy.
- Alta nueva de otra zona → aviso, como hoy.

**Verificación:** test de la regla como función pura (`lib/phone.ts` o
`lib/booking-rules.ts`) con los tres casos; prueba local reservando.

**Archivos:** `lib/actions/booking.ts`, `components/public/dni-gate.tsx`,
`lib/phone.ts` (+ test).

#### Z2 — El mensaje de WhatsApp trae los datos del cliente (XS)
`OutOfAreaNotice` suma al texto nombre, DNI, teléfono y email ya cargados,
para que el peluquero no tenga que pedirlos.

**Aceptación:** el link abre WhatsApp con los cuatro datos; los que falten
no dejan huecos raros en el texto.

**Verificación:** test del armado del mensaje; Chrome a 390 px.

**Archivos:** `components/public/out-of-area-notice.tsx`,
`components/public/booking-stepper.tsx`, `components/public/dni-gate.tsx`
(pasar los datos).

#### Z3 — Hoja "Agregar cliente" desde Más (S)
Decisión del usuario: una hoja, no una página. Fila "Agregar cliente" en Más
que abre una hoja (el `Dialog` del panel, que en el iPhone ya es bottom sheet)
con DNI, nombre, teléfono y email. **Sin restricción de zona:** acepta
cualquier número argentino válido. Email opcional (sin email el cliente no
recibe ningún mail; la hoja lo aclara debajo del campo). Sin foco automático
al abrir.

**Aceptación:**
- El peluquero crea la ficha de un cliente de otra zona y ese cliente reserva
  desde la web con su DNI sin ver el aviso.
- Un DNI que ya tiene ficha la actualiza (mensaje "Ya existía: actualizamos
  sus datos") y no duplica.
- Teléfono inválido o DNI mal escrito → error en el campo, como en la
  reserva.
- Solo admins (misma verificación que las demás acciones del panel).

**Verificación:** tests del schema; Chrome a 390 px; prueba de punta a punta
local (alta → reserva con ese DNI). Datos de prueba borrados.

**Archivos:** `app/admin/mas/add-customer-sheet.tsx` (nuevo),
`lib/actions/customers.ts` (nuevo), `lib/validation/schemas.ts`,
`app/admin/mas/page.tsx`.

Nota: la nav de escritorio no tiene Más, así que en la compu la hoja solo se
alcanza entrando a `/admin/mas`. Si hace falta, se suma después.

### Checkpoint 2 — Clientes de otra zona
- [ ] Tests, typecheck, lint y build sin errores
- [ ] Usuario prueba en el iPhone el flujo completo con un número de otra
      provincia

### Fase 3 — Estados de carga y error del panel

Reglas comunes (nota "REGLAS DE CARGA" del diseño): header, tab bar, toolbar y
segmentado nunca cargan; esqueleto solo donde hay datos, con la medida exacta
y `role="status"`; pulso 1.6 s y quieto con Reducir movimiento; aparece a los
200 ms y, una vez visible, dura al menos 400 ms; con toques seguidos solo se
pinta la última fecha. Probar primero `animation-delay` en CSS y el
escalonado de Suspense de React antes de escribir temporizadores.

#### L1 — Spike: Agenda · Día con toolbar inmediato y datos en Suspense (M, riesgo alto)
Agenda Día: la página calcula vista, fecha y título sin esperar consultas y
pinta el toolbar; `getSaleCatalog` y los turnos van dentro de
`<Suspense key={vista + fecha}>`. El toolbar guarda la fecha pendiente en el
cliente (estado optimista): título, tira y flechas se mueven al toque; la
flecha tocada queda en `#f0f1f3` (revisar `useLinkStatus`). Se decide qué pasa
con `app/admin/agenda/loading.tsx` (sin doble esqueleto).

**Aceptación:**
- ▶ desde el día 19 → el título dice el 20 en el mismo frame; la lista va a
  esqueleto de 4 filas sin huecos "Libre".
- ▶ ▶ ▶ rápido → termina en el 22 y solo se pinta el 22.
- Respuestas de menos de 200 ms no muestran esqueleto.

**Verificación:** build; Chrome a 390 px con CPU y red lentas; dejar escrita
en este plan la decisión del mecanismo antes de seguir con L2.

**Archivos:** `app/admin/agenda/page.tsx`, `app/admin/agenda/agenda-toolbar.tsx`,
`app/admin/agenda/agenda-views.tsx`, `components/admin/loading-skeletons.tsx`,
`app/admin/agenda/loading.tsx`.

**Decisión (L1 hecho, 2026-10-03) — mecanismo para L2 y L3:**
- **Sin `Suspense` del servidor.** La página sigue esperando todos sus datos
  antes de responder. El cliente (`AgendaNavigation`) guarda con
  `useOptimistic` la vista y la fecha recién tocadas y navega con
  `router.push` dentro de `startTransition`. Comprobado con 1,5 s de demora:
  el título queda en la fecha nueva durante toda la espera y el
  `loading.tsx` de la ruta no reaparece al cambiar `?fecha=`.
- **Lista:** `AgendaBody` muestra el esqueleto mientras lo pedido no
  coincida con lo que trajo el servidor. Esa misma comparación resuelve los
  toques seguidos: ▶ ▶ ▶ desde el 24 terminó en el 27 sin pintar respuestas
  intermedias.
- **Tiempos:** los 200 ms de demora los pone `.hs-reveal-delayed` en CSS, en
  una clase aparte del pulso, porque "Reducir movimiento" apaga el pulso pero
  no esta demora. Los 400 ms de mínimo los pone `lib/loading-hold.ts`, con
  tests, y dos temporizadores. El throttling de React no sirve acá: solo
  aplica a límites de `Suspense`.
- **Flecha tocada:** `#f0f1f3` (`--hs-track`) sale del estado propio de la
  navegación. No se usa `useLinkStatus`, que se saltea cuando la ruta ya
  estaba precargada.
- **Links reales:** flechas, tira y "Hoy" siguen siendo `<Link href>`; solo
  se intercepta el clic simple. El segmentado Día/Semana/Mes sigue como link
  común hasta L2.
- **`loading.tsx`:** se queda para entrar desde la barra de pestañas, y
  ahora arma su lista con las mismas barras que `DayListSkeleton`.
- **Producción:** también se comprobó con `next build` + `next start`, donde
  los links sí se precargan y la ruta tiene `loading.tsx`. Con la misma
  demora temporal, ▶ y ▶ ▶ ▶ se comportaron igual que en desarrollo: el
  esqueleto de la ruta nunca apareció y no hubo recarga. No hizo falta
  `prefetch={false}`.
- **Toques seguidos:** la demora de 200 ms arranca solo en el primer toque,
  igual que la del CSS, que empieza cuando se montan las barras. Los toques
  siguientes solo reinician el mínimo; así una respuesta que llega en el
  medio no suelta las barras antes de los 400 ms.
- **En L1 solo Día navega así.** L2 suma Semana y Mes (con sus esqueletos
  dentro de `AgendaBody`) y el segmentado. L3 replica `AgendaNavigation` en
  Caja; conviene extraerlo a un componente común en ese momento.

#### L2 — Agenda: Semana, Mes y "Hoy" (M)
El mismo mecanismo para cambiar de vista y de período en Semana y Mes, con
sus esqueletos (barra de 38 px por día; contador + 3 filas, grilla del mes
real con los puntitos al llegar). "Hoy" deshabilitado mientras el período
mostrado contiene hoy, con la regla como función pura.

**Aceptación:** los 6 artboards de Agenda se ven como el diseño; "Hoy" no
dispara carga si ya estás en hoy.

**Verificación:** test de `periodContainsToday` (día/semana/mes, bordes de mes
y de semana); Chrome a 390 y 1200 px.

**Archivos:** `app/admin/agenda/*`, `components/admin/loading-skeletons.tsx`,
`lib/dates.ts` (+ test).

#### L3 — Caja: vistas, períodos y "Hoy" (M)
Mismo mecanismo en Caja. `CajaSkeleton` pasa de filas de movimientos a las 3
tarjetas de categoría cerradas (iPhone) y a la tabla por categoría
(escritorio). Nunca `$ 0` ni el total anterior mientras carga. La píldora de
fecha queda a opacidad .6 si se eligió desde el calendario nativo.

**Aceptación:** los 7 artboards de Caja se ven como el diseño; el esqueleto
de escritorio calza con `category-table.tsx`.

**Verificación:** Chrome a 390 y 1200 px con red lenta.

**Archivos:** `app/admin/caja/page.tsx`, `caja-toolbar.tsx`, `caja-views.tsx`,
`components/admin/loading-skeletons.tsx`, `components/admin/native-date-pill.tsx`.

#### L4 — Más: carga y error solo en la tarjeta de sesión (S)
El título y las filas se pintan al instante; `getUser()` pasa a una tarjeta
de sesión dentro de `Suspense` (esqueleto: mail 208×14, botón 64×44). Si
falla por red: tarjeta de error (círculo `#fdeeec`, alerta, tipo de error +
hora, "Reintentar" → `router.refresh()`) y las filas siguen andando. Sesión
vencida → `/login`.

**Aceptación:** con Supabase caído (simulado) Servicios sigue abriendo; los
artboards `MasCarga` y `MasError` coinciden.

**Verificación:** Chrome a 390 px, forzando el error en local.

**Archivos:** `app/admin/mas/page.tsx`, `app/admin/mas/session-card.tsx`
(nuevo).

#### L5 — Servicios, Productos y Disponibilidad con `loading.tsx` (S)
Cada una con su `BackHeader` real, el texto y el botón que no dependen de
datos, y el esqueleto del diseño. En Disponibilidad no aparece la barra
Descartar/Guardar.

**Aceptación:** al tocar la fila en Más la navegación es inmediata y se ven
`ServiciosCarga`, `ProductosCarga` y `DisponibilidadCarga`.

**Verificación:** Chrome a 390 y 1200 px con red lenta.

**Archivos:** `app/admin/{servicios,productos,disponibilidad}/loading.tsx`
(nuevos), `components/admin/loading-skeletons.tsx`.

#### L6 — Volver a Más sin recargar y con la fila marcada (S)
Al tocar una fila de Más se guarda una marca en `sessionStorage`; el ← de
`BackHeader` usa `router.back()` si la marca está (vuelve desde la caché, sin
esqueleto) y si no navega como hoy. La fila de la que venís queda en
`#f0f1f3` 600 ms; con Reducir movimiento se quita sin fundido. Desde el
detalle de una categoría, ← sigue yendo a Productos.

**Aceptación:** los tres artboards "Volver a Más" se ven como el diseño;
entrar por URL directa y tocar ← sigue funcionando.

**Verificación:** Chrome a 390 px (con y sin historial previo); iPhone.

**Archivos:** `components/admin/back-header.tsx`, `app/admin/mas/page.tsx`
(filas como componente cliente).

### Checkpoint 3 — Estados de carga
- [ ] Tests, typecheck, lint y build sin errores
- [ ] Usuario recorre en el iPhone los 22 artboards (con datos reales y
      conexión del celular)

### Fase 4 — Recordatorio para volver (1d)

**Bloqueada por** R3 producción (`CRON_SECRET` en Vercel) de la Fase 3
anterior.

Reglas del diseño: último turno `completado` hace 30 días o más; sin turnos
futuros `pendiente` ni `confirmado`; no se le mandó este mail desde ese
último turno; no se dio de baja; tiene email.

#### V1 — Migraciones (S)
`0013_email_vuelta.sql`: solo `alter type email_type add value 'vuelta'`.
`0014_recordatorio_vuelta.sql`: `customers.comeback_opt_out_at timestamptz`
y el índice único parcial `email_log (appointment_id, type) where type =
'vuelta' and status = 'enviado'`. Tipos regenerados.

**Aceptación:** las dos aplican en local y se pueden correr dos veces sin
error.

**Verificación:** aplicar en local; typecheck.

**Archivos:** `supabase/migrations/0013_*.sql`, `0014_*.sql`,
`lib/supabase/database.types.ts`.

#### V2 — Mail 1d "Ya pasó un mes" (S)
`buildComebackEmail` con el layout y el logo de los demás mails (no el data
URI del artifact): pastilla "Recordatorio", título, texto con los días,
última visita, servicio, "Reservar turno →" a la portada, "Sin seña: pagás en
el local", pie con "No quiero recibir recordatorios". HTML + texto plano +
preheader. Variantes en `/dev/emails`.

**Aceptación:** coincide con el artifact a 375 y 600 px; asunto
"<Nombre>, ya pasó un mes de tu último corte".

**Verificación:** tests como los de `templates.test.ts` (título, detalle, CTA,
link de baja, escape); revisar `/dev/emails`.

**Archivos:** `lib/email/templates.ts` (+ test), `app/dev/emails/page.tsx`.

#### V3 — A quién le toca (S)
`pickComebacks` (puro, con tests) y la consulta en `lib/data/comebacks.ts`.
Antes de cerrarla: contar en la base cuántos turnos pasados quedaron en
`confirmado` sin cobro (ver punto 6 de arriba) y reportarlo.

**Aceptación:** tests cubren: 29/30/31 días (por día de calendario en la zona
del local), turno futuro pendiente o confirmado, ya enviado para ese turno,
dado de baja, sin email, cliente que volvió (nuevo ciclo), tope de antigüedad.

**Verificación:** `npm test`.

**Archivos:** `lib/comebacks.ts` (+ test), `lib/data/comebacks.ts`.

#### V4 — Darse de baja (S)
Token derivado del id del cliente (`lib/tokens.ts`), página `/baja/[token]`
con "Dejar de recibir recordatorios" (server action) y confirmación. Token
inválido → 404.

**Aceptación:** abrir el link no cambia nada; tocar el botón marca
`comeback_opt_out_at` y ese cliente deja de aparecer en V3.

**Verificación:** tests del token; prueba local.

**Archivos:** `lib/tokens.ts` (+ test), `app/baja/[token]/page.tsx` (nuevo),
`lib/actions/unsubscribe.ts` (nuevo).

#### V5 — Envío diario (S)
`sendComeback` (reserva la fila de `email_log` antes de mandar, como
`sendReminder`) y el paso nuevo en `/api/cron/reminders`, aislado con su
propio `try/catch`; el resumen suma `vuelta: { enviados, error, … }`.

**Aceptación:** con un cliente de prueba de hace 31 días: la 1ª llamada
envía, la 2ª no repite; si el recordatorio del día anterior falla, este igual
corre.

**Verificación:** prueba local con `CRON_SECRET`; en producción, revisar el
log de la primera ejecución. Datos de prueba borrados.

**Archivos:** `lib/email/send.ts`, `app/api/cron/reminders/route.ts`.

### Checkpoint 4 — Recordatorio para volver
- [ ] Tests, typecheck, lint y build sin errores
- [ ] Usuario recibe el mail en Gmail (iPhone, claro y oscuro) y prueba la
      baja
- [ ] Primera ejecución en producción revisada en los logs de Vercel

#### F1 — SPEC y README al día (XS)
Botón de WhatsApp, hoja "Agregar cliente", regla de la ficha para otra zona, estados de
carga, recordatorio para volver y baja; migraciones 0013 y 0014.

## Dependencias

```
C1, C2, C3, C4 ── independientes entre sí
Z1 ──► Z3 (la ficha creada solo sirve si editarla no vuelve a bloquear)
Z2 ── independiente
L1 (spike) ──► L2, L3
L4 ──► L6 ; L5 independiente
R3 producción ──► V5
V1 ──► V3, V4, V5 ; V2 ──► V5
```

C4 y C3 tocan `booking-landing`/`booking-stepper`: hacerlas en serie.
L2 y L3 comparten `loading-skeletons.tsx`: en serie.

## Riesgos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Suspense con `key` + estado optimista no se comporta como se espera en Next 16 | Alto | L1 es un spike sobre una sola vista; se decide antes de replicar |
| Scroll de iOS con inercia: retirar la portada a mitad del gesto hace saltar la página | Medio | Disparar solo al terminar el scroll; prueba en el iPhone en el Checkpoint 1 |
| `after()` no termina los envíos en Vercel | Medio | Verificar `email_log` en producción después de C1; si falla, volver al `await` |
| Turnos atendidos que nunca se cobran no llegan a `completado` | Medio | Contarlos en V3 y decidir con el usuario |
| Primera corrida del recordatorio le escribe a todos los clientes viejos | Medio | Tope de antigüedad (abajo) |
| El botón de WhatsApp tapa acciones en pantallas chicas | Bajo | Relleno inferior en el stepper; probar a 320 px |

## Decisiones confirmadas por el usuario (2026-10-03)

1. **WhatsApp** solo en la portada y la reserva; no en "Tu turno" /
   "Turno solicitado" (ahí ya está en la cancelación).
2. **Alta del cliente de otra zona:** una hoja "Agregar cliente" desde Más,
   sin restricción de zona (no una página Clientes).
3. **Email opcional** en esa hoja: un cliente sin email no recibe ningún mail
   (ni confirmaciones ni recordatorios).
4. **Tope del recordatorio para volver:** solo si el último turno completado
   fue hace entre 30 y 60 días.
5. **La baja** corta solo el recordatorio de "ya pasó un mes", no el del día
   anterior.
6. **Turnos atendidos sin cobrar** no cuentan como visita: solo `completado`.
