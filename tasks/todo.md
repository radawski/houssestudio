# Todo — Wireframes móviles del panel admin

## Fase A — Fundaciones compartidas
- [x] Token de blanco (`--hs-white`) + `--card`/`--popover` remapeados
- [x] Punto ámbar del badge pendiente (`amber-500` → `amber-700`)
- [x] `Button`: tamaños táctiles aditivos (`touch`, `touch-lg`, `touch-xl`, `icon-touch`)
- [x] `Dialog` → bottom sheet en mobile, centrado sin cambios en desktop
- [x] `Toaster`: bottom-center + offset 96 en `/admin`, público sin cambios
- [x] Tab bar inferior (`AdminTabBar`) + shell con scroll propio + `/admin/mas`
- [x] **Verificación manual** — confirmada por el usuario en iPhone
- [x] Header "← + título" de Servicios/Disponibilidad en mobile — hecho en
      F/G (`components/admin/back-header.tsx`)

## Fase B — Hoy + Ficha del turno
- [x] `lib/appointment-timeline.ts`: historial puro, con tests
- [x] `lib/data/appointments.ts`: sumar el pago asociado al turno
- [x] `components/admin/appointment-sheet.tsx`: ficha (completado/cancelado/no_show)
- [x] `AppointmentCard` + `ConfirmedAppointmentActions`: ficha al tocar la
      tarjeta en completado/cancelado/no_show, pending compartido
      Cobrar/No vino, tel/mail, picker de medio de pago dibujado
- [x] `app/admin/page.tsx`: "Por responder" → "Pendientes"
- [x] **Verificación manual** — encontró y corrigió desborde horizontal
      (`grid gap-3` sin columnas explícitas en 4 listas)

## Fase C — Agenda mobile
- [x] `lib/availability.ts`: `computeFreeGaps` (huecos libres, sin trocear por
      duración ni filtrar por `now`), con tests
- [x] `lib/agenda-day.ts`: `buildAgendaDayRows` (intercala turnos + huecos),
      más `groupByDay`/`dayNumber`/`WEEKDAY_SHORT` (movidos acá para romper un
      ciclo de imports entre `agenda-views.tsx` y `month-mobile.tsx`)
- [x] `components/admin/status-badge.tsx`: `AdminStatusBadge` compartido
      (monocromo salvo pendiente en ámbar) — reemplaza el `SHEET_BADGE` local
      de la ficha, ahora también usado en las 3 vistas de Agenda
- [x] `lib/data/appointments.ts`: `getBusinessHoursForDay` + `getTimeBlocksForDay`
- [x] Vista día: lista mobile [hora · tarjeta/hueco] con ficha de solo lectura
      al tocar (sin botones, a diferencia de Hoy/Solicitudes); desktop
      intacto detrás de `hidden md:block`
- [x] Vista semana: lista vertical por día en mobile; grilla de 4 columnas
      original detrás de `hidden md:grid` (con el `grid-cols-1`/`sm:grid-cols-2`
      correcto — mismo bug de desborde de la Fase B que seguía latente acá)
- [x] Vista mes: `app/admin/agenda/month-mobile.tsx` (client, selección local
      de día) + calendario compacto; desktop intacto detrás de `hidden md:block`
- [x] `WalkInSaleButton`: segundo `DialogTrigger` como FAB fixed en mobile,
      mismo diálogo que el botón de escritorio
- [x] `AgendaToolbar`: tira de 7 días (solo vista día, mobile), segmentado
      Día/Semana/Mes a todo el ancho en mobile, `Hoy` reordenado con `order-last`
- [x] **Verificación manual** — día/semana/mes correctos en iPhone real;
      desktop confirmado sin cambios; color de celda del mes se deja como
      está (con turnos = oscuro, sin turnos = gris; no se agrega el criterio
      de "cerrado" de `AgendaMes.dc.html`)

## Fase D — Caja mobile
- [x] `app/tokens.css`: `--hs-heat-1/2/3` + `--hs-surface-closed` para el
      heatmap del mes (valores exactos, mismo criterio que Fase B/C)
- [x] `lib/cashbox.ts`: `buildDayRevenues`/`bestDay`/`averagePerOpenDay`, con
      tests (incluida una prueba de conservación contra `summarizeCharges`)
- [x] `lib/dates.ts`: `monthDateKeys` (días reales del mes, sin el relleno de
      `monthRange`), con tests
- [x] `lib/format.ts`: `formatCompactAmount` ("42k") para las celdas del heatmap
- [x] `lib/data/appointments.ts`: `getClosedWeekdays`
- [x] `app/admin/caja/caja-views.tsx` (nuevo): `SummaryCard`, `MovementsList`,
      `WeekBars`, `MonthHeatmap` — las bandas de color del heatmap son
      relativas al mejor día del propio mes (no un peso fijo como el
      wireframe), decisión confirmada con el usuario
- [x] `app/admin/caja/page.tsx`: tarjeta única + lista en día, barras en
      semana, heatmap en mes; las tres tarjetas y la tabla de escritorio
      quedan intactas detrás de `hidden md:grid`/`hidden md:block`
- [x] `app/admin/caja/caja-toolbar.tsx`: segmentado a todo el ancho en mobile,
      mismo patrón que `agenda-toolbar.tsx` sin FAB ni tira de días
- [x] **Verificación manual** — confirmada por el usuario en iPhone (día, semana y mes)

## Fases E–H (pendientes, ver tasks/plan.md)
- [x] E — Solicitudes mobile: `app/admin/solicitudes/request-card.tsx`
      (fecha larga, rango, chips DNI/teléfono con `tel:`, nota, Aceptar y
      Rechazar), escritorio intacto detrás de `hidden md:grid`. Hoja de
      rechazo/cancelación (`CancelAppointmentButton`, también en Hoy y
      Agenda): título "Rechazar/Cancelar turno", cliente y día en el
      subtítulo, 3 chips de motivo que llenan el textarea, botón rojo sólido
      a ancho completo. `formatDni`/`formatDayAndTime` con tests
- [x] E — Verificado en iPhone: tarjeta, chip de teléfono (ofrece llamar),
      motivo de un toque, botón rojo, Volver y rechazo real
- [x] F — Servicios mobile: `components/admin/back-header.tsx` ("← +
      título", también para la Fase G), tarjeta mobile con switch `lg`
      (44×26, área 48×44; tamaño nuevo en `components/ui/switch.tsx`),
      chips de precio/duración, editar y eliminar de 44. FAB "Nuevo
      servicio". Hoja con duración como campo libre de minutos (5 a 480;
      el `<select>` del diseño se descartó a pedido del usuario: no permitía
      20 o 40 min), precio con "$", fila
      "Visible en el portal". Vacío con "+ Crear el primero". Escritorio
      con su lista de siempre. Comprobado en Chrome a 390px y guardado real
- [x] F — Verificado en iPhone (salvo la duración libre, cambiada después)
- [x] G — Disponibilidad mobile: "← Disponibilidad", ventana de reserva
      colapsada con su hoja, 7 filas de 52px (resumen de bloques que abre la
      hoja del día + switch abierto/cerrado aparte), "+ Bloquear un rango"
      en hoja y lista de bloqueos. Todo guarda al instante (decisión del
      usuario: sin barra de cambios pendientes). Acciones nuevas
      `saveBusinessDay` (un día, o `copyToAll` a los 7 respetando
      abiertos/cerrados — decisión del usuario) y `setBusinessDayOpen` (no
      abre un día sin bloques), las dos sobre `save_business_hours` o
      `business_hours`. Escritorio intacto. Comprobado en Chrome a 390px:
      guardar un día y abrir/cerrar el domingo, el horario quedó igual
- [x] G — Verificado en iPhone. De la prueba salió: las hojas ya no enfocan
      el primer campo al abrirse en mobile (abría el teclado o el selector
      de fecha); `DialogContent` manda el foco a la hoja por debajo de 640px
- [x] H (1/3) — Avisos: `lib/toast-error.ts` con "Reintentar" en todas las
      acciones del panel que fallan por red (no en errores de validación),
      `friendlyErrorMessage` reemplaza errores de red y el mensaje genérico
      de producción de Next; éxito en tinta y error blanco con borde rojo
- [x] H (2/3) — `loading.tsx` en Hoy, Agenda, Solicitudes y Caja
      (`components/admin/loading-skeletons.tsx`), con `--hs-skeleton` y
      pulso de 1.6s quieto con "Reducir movimiento". Hoy pasó a
      `app/admin/(hoy)/` para que su esqueleto no aparezca al entrar a
      Servicios, Disponibilidad o Más
- [x] H (3/3) — `error.tsx` en Hoy, Agenda, Solicitudes, Caja, Servicios y
      Disponibilidad con `components/admin/load-error.tsx` (Reintentar =
      `retry()` de Next 16, que vuelve a pedir los datos; identificador y
      hora para reportar). Hoy conserva el h1 con la fecha. Probado con una
      ruta que falla a propósito (ya borrada)
- [x] H — Verificado en iPhone

## Correcciones de la ronda de prueba (ver tasks/plan-correcciones.md)
- [x] T1 — Logo sin animación, cancelados fuera de Hoy/Agenda, mes de Caja
      → vista día, espacio blanco de la tab bar (sin `viewportFit: "cover"`:
      el sitio se usa en Safari, no como app instalada; se bajó el piso de
      22px a 6px). También: avisos del panel ahora sí sobre la tab bar en
      mobile (`mobileOffset`, Sonner ignoraba `offset` bajo 600px)
- [x] T1 — Verificado en iPhone: cancelados, mes → día, tab bar y avisos OK.
      FAB "Venta suelta": `bottom-[84px]` y aviso en `80px` (sin `env()`,
      que vale 0 sin `viewportFit: "cover"`). Verificado en iPhone 16 Pro.
      En el iPhone 13 Pro del usuario (iOS 18.7.8) no corre JavaScript y el
      FAB sale arriba; causa no confirmada (no es la versión de Safari).
      El usuario decidió probar desde ahora en el 16 Pro
- [x] T2 — Selector de fecha nativo en Caja (vista día):
      `components/admin/native-date-pill.tsx` (input date con opacidad 0
      sobre la píldora + `showPicker()` solo con mouse), en `CajaToolbar`
- [x] T2 — Verificado en iPhone 16 Pro, iPhone 13 Pro y desktop. En el
      celular no andaba porque la página no hidrataba: `next dev` bloqueaba
      sus scripts al entrar por la IP de la red local. Arreglado con
      `allowedDevOrigins` en `next.config.ts`; con eso el 13 Pro también
      ejecuta JavaScript. Además, `showPicker()` ya no se llama con el dedo
      (iOS entrega el toque como `click` con `pointerType` "mouse")
- [x] FAB "Venta suelta" verificado abajo también en el iPhone 13 Pro: salía
      arriba porque Safari tenía guardado un CSS viejo, sin la regla
      `bottom-[84px]` (se resolvió borrando los datos del sitio; no era código)
- [x] T3 — `components/public/booking-landing.tsx` envuelve portada y
      stepper; `HeroCta` baja suave (ya sin salida por reducir movimiento),
      espera el fin del scroll (`scrollend` o 150 ms sin `scroll`) y, si
      llegó, retira la portada y deja el scroll en 0 en el mismo commit.
      Continuar/Volver suben al tope de `#reservar` si quedó fuera de
      pantalla. Medido en Chrome: sin salto, foco en `#reservar`
- [x] T3 — Verificado en iPhone. De la prueba salió además: elegir día
      baja a los horarios, elegir horario deja "Continuar" a la vista, y el
      scroll al tope al cambiar de paso va después del render (de 2 a 3 la
      página se achicaba y Safari cortaba la animación)
- [x] T4 — Venta de productos: migración 0008 (`walk_in_sales.kind`,
      aplicada en Supabase), esquema con unión discriminada + tests,
      segmentado Servicio/Producto en el diálogo, etiqueta "Producto" en
      Caja (lista mobile y tabla, columna renombrada a "Concepto"), SPEC §2.
      Comprobado en desktop: la venta de producto aparece y suma en el total
- [x] T4 — Verificado en iPhone. De la prueba salió: la nota opcional de la
      venta no se veía en ningún lado; ahora va entre comillas debajo del
      concepto, en la lista mobile y en la tabla de Caja
- [x] T5 — Horario con N bloques: migración 0009 (aditiva, aplicada):
      `business_hour_ranges` con exclusión de solapamiento por día, copia
      de los tramos viejos y `save_business_hours(p_days jsonb)` (una
      transacción, acepta 1..7 días: la Fase G la reusa para guardar por
      día). Motor con `ranges[]` (tests de horario partido sin cambiar sus
      resultados + 3 bloques, bloque corto, desordenados), validación con
      error por día y bloque, `DayRangesEditor` reutilizable. Comprobado:
      bloques copiados bien, slots de lun/mar/mié para los 2 servicios
      idénticos a antes, guardar sin cambios OK, solapamiento rechazado
- [x] T5 — Verificado por el usuario en iPhone y desktop
- [x] T5 — Migración 0010 (aplicada): retira `opens_at`/`closes_at`/
      `opens_at_2`/`closes_at_2` de `business_hours`. Comprobado: columnas
      fuera, bloques intactos, Disponibilidad guarda, Agenda y reserva
      pública respetan 3 bloques. README con las 10 migraciones
- [x] T6 — Verde en horarios: `--hs-green` (#137a55, no el #178a5e del
      plan: ese daba 3.98:1 sobre --hs-paper) y `--hs-green-soft`; hora
      verde semibold 13px en GapRow y AgendaAppointmentRow, filete de 3px
      solo en tarjetas con turno. Revisado en Chrome a 390px
- [x] T6 — Verificado en iPhone (hizo falta borrar los datos del sitio en
      Safari: en `next dev` el CSS conserva el mismo nombre y quedó una copia
      vieja)

## Emails con la estética de la web (ver tasks/plan-emails.md)
- [x] Decisiones: token derivado con HMAC para el link; "Ver solicitudes" →
      `/admin/solicitudes`
- [x] `design/Emails.dc.html` sumado por el usuario
- [x] E1 — `lib/email/layout.ts`: documento (fondo, tarjeta fluida de 600px
      con tabla fantasma para Outlook, preheader oculto, headers cliente/panel,
      footers), badge, título, saludo, fecha + horario (tachada si cancelado,
      badge a la derecha en el panel), tabla de detalle, botón bulletproof,
      nota, `escapeHtml`, `cancellationNote` (0 → "hasta el horario del
      turno"). Detalles tomados de `Emails.dc.html`: saludo 15px, rótulo del
      panel, footers, flecha en los botones. 14 tests
- [x] E2 — `npm run email:logo` (`scripts/generar-logo-email.mjs`, `sharp`):
      glifo blanco con la luminancia como alfa, `public/email/logo-92.png` y
      `logo-56.png` (2× de 46×52 y 28×31). Revisado sobre `#050505`: sin
      recuadro. Se sirven sin sesión
- [x] E3 — 1a, 2a, 1c y 2b en HTML + texto plano + preheader
      (`lib/email/templates.ts`), con las mismas funciones y datos más
      `endsAt` (para "14:30 – 15:15 h"); `send.ts` manda `html` y `text`.
      "Ver solicitudes" → `/admin/solicitudes`, "Abrir agenda" → el día del
      turno, "Reservar otro turno" → portada. Tests por mail (título,
      detalle, CTA, motivo opcional, escape). Revisados en Chrome a 375px
- [x] E4 — Token derivado: `lib/tokens.ts` (`deriveManageToken` = HMAC de
      `MANAGE_TOKEN_SECRET` sobre "manage:" + id, `manageTokenMatches`), con
      tests; `createBooking` genera el id antes del insert. Email 1b
      (`buildAppointmentConfirmedEmail`, `sendAppointmentConfirmed`) desde
      `confirmAppointment`, con el plazo leído al enviar; sin botón para
      turnos anteriores al cambio. Migración `0011_email_aceptacion.sql`
- [x] E4 — Prueba local: reservar y aceptar mandó 1a, 2a y 1b (registrados
      en `email_log`, incluido `aceptacion`); el link derivado abre el turno.
      `MANAGE_TOKEN_SECRET` cargado en Vercel y 0011 aplicada
- [x] E4 — Publicado y verificado en producción por el usuario (reservar,
      aceptar, cancelar; botones y logo). Hizo falta cargar en Vercel
      `NEXT_PUBLIC_SITE_URL` (tipo Config), `RESEND_API_KEY`, `EMAIL_FROM` y
      `ADMIN_EMAIL`: en producción los mails nunca se habían enviado
- [x] E2 (ajuste) — Gmail en modo oscuro (iPhone) invierte el header a
      blanco: el logo pasa a llevar su propio cuadrado `#050505` con esquinas
      redondeadas, así se ve en los dos modos
- [x] E5 — `buildReminderEmail` ("Mañana te esperamos"): layout de 1b,
      misma nota y plazo. Solo el template y tests; el envío sigue en Fase 3
- [x] E6 — `app/dev/emails/page.tsx`: los 6 mails (más variantes: 1b sin
      link y plazo 0, 1c sin motivo, 2b por el peluquero, nombre con
      caracteres especiales) a 375px y 600px con asunto, preheader y texto
      plano. 404 en producción (comprobado con `next start`)
- [x] E7 — Verificado por el usuario en Gmail (iPhone, modo claro y oscuro)
      con envíos reales de producción. Mail del iPhone y Outlook sin revisar

## Fase 3 — Recordatorios automáticos (ver tasks/plan-recordatorios.md)
- [x] Decisión: 10 de la mañana de Buenos Aires (`0 13 * * *` UTC; en Hobby sale dentro de esa hora)
- [x] R1 — `lib/reminders.ts` (`tomorrowRange`, `pickReminders`, con tests), `lib/data/reminders.ts` y `sendReminder` (reserva la fila de `email_log` antes de mandar: el índice único frena un envío doble)
- [x] R2 — `app/api/cron/reminders/route.ts` (401 sin `Bearer CRON_SECRET`), `vercel.json` con el cron diario, `CRON_SECRET` en `.env.local`; `manageUrlFor` pasa a `lib/tokens.ts`
- [x] R3 local — 401 sin clave o con clave falsa; con un turno de prueba de mañana: 1ª llamada envió 1, 2ª lo salteó (turno de prueba borrado)
- [ ] R3 producción — el usuario carga `CRON_SECRET` en Vercel; después push y confirmar la primera ejecución en los logs

## Dominio propio para los emails (en curso)
- [x] Decisión: `houssestudio.com.ar` (NIC Argentina), para el sitio y los
      mails (`houssestudio.com` está tomado desde 2018)
- [x] D0 — El cliente aceptó el acuerdo de mantenimiento
      (doc: https://claude.ai/code/artifact/33294188-21b6-47dc-9827-51d453fd940c)
- [x] D1 — `houssestudio.com.ar` registrado a nombre del cliente el
      2026-10-02; **vence el 2027-10-02** (renovación a cargo del cliente)
- [x] D2 — Delegado en NIC a `ns1/ns2.vercel-dns.com`, agregado al proyecto
      y con **Enable Vercel DNS** en Domains de la cuenta (sin eso Vercel
      respondía REFUSED). `https://houssestudio.com.ar` responde 200 con
      certificado Let's Encrypt; `www` redirige con 301 al dominio sin www
- [x] D3 — Dominio verificado en Resend (región São Paulo): MX y SPF en
      `send`, DKIM en `resend._domainkey`, publicados y comprobados
- [x] D3 — DMARC en modo observación (`_dmarc`, `v=DMARC1; p=none;`). Las
      respuestas a `turnos@` se pierden: decisión del usuario, sin "responder a"
- [x] D4 — `EMAIL_FROM` = `HOUSSESTUDIO <turnos@houssestudio.com.ar>` en Vercel
      y `.env.local`
- [x] D4 — Prueba final en producción: llegaron todos los mails desde `turnos@houssestudio.com.ar`
- [x] Foto de perfil del remitente: decisión del usuario, sin foto (BIMI
      exige marca registrada y certificado pago; la cuenta de Google exige
      que `turnos@` reciba mails)
- [ ] **Al terminar las pruebas: cambiar `ADMIN_EMAIL` en Vercel al email del
      cliente (el peluquero).** Hoy sigue el del usuario a propósito, para
      probar. En `.env.local` puede quedar el del usuario
- [ ] D4 — `EMAIL_FROM` → `HOUSSESTUDIO <turnos@houssestudio.com.ar>` en
      Vercel y `.env.local`; prueba a una casilla ajena
- [x] D5 — Sitio en `https://houssestudio.com.ar` y `NEXT_PUBLIC_SITE_URL`
      actualizado en Vercel

## Al arrancar el abono (antes de usarla con clientes reales)
- [ ] Pasar el proyecto de Vercel a Pro (USD 20/mes): Hobby prohíbe uso comercial
- [ ] Copias de seguridad automáticas propias de Supabase (el plan gratis no
      tiene backups y pausa el proyecto tras 7 días sin uso)

## A futuro (quizás; sin fecha ni especificación)
- CRM: ficha de cliente con historial de turnos, gasto, ausencias y notas
- Reportes: comparativas entre meses, servicios más vendidos, horarios
  pico, ausencias, clientes nuevos vs. recurrentes

## Categorías, productos, venta con carrito y Caja por categoría (ver tasks/plan-productos.md)
- [x] Decisiones: categorías reemplazan barras/calendario en Caja iPhone;
      servicios = "Cortes"; venta solo con catálogo (sin precio editable ni
      producto libre); ventas viejas libres → "Otros"
- [x] P1 — Migración `0012_productos_y_categorias.sql` (categorías, productos,
      `walk_in_sales` una fila por ítem con `sale_id`/`quantity`/`unit_price`,
      `record_walk_in_sale` con precios del catálogo), tipos, `groupByCategory`
      (6 tests, con conservación del total) y movimientos de Caja con categoría
- [x] P1 — 0012 aplicada: 6 ventas viejas con cantidad 1 y precio = monto,
      tablas nuevas y función OK; Caja de septiembre igual ($126.300)
- [x] P2 — `/admin/productos`: escritorio en dos columnas (categorías + alta
      en línea, editar y borrar por fila), iPhone en 3 pasos (categorías →
      detalle con menú de opciones → hoja Nuevo/Editar producto). Acciones en
      `lib/actions/products.ts` (nombre repetido y categoría con productos
      con mensajes propios), Más con "Productos · NUEVO", pestaña en la nav,
      tab bar con Más activo. Además: los campos de precio/monto usaban
      `step={100}` y el navegador bloqueaba en silencio montos como $12.050
      (servicios y cobro de turno corregidos). Probado en Chrome a 390 y
      1200 px con datos de prueba (borrados)
- [x] P2 — Verificado por el usuario en iPhone
- [x] P3 — Venta suelta con carrito (`walk-in-sale-button.tsx`): buscador,
      Cortes + categorías con productos activos desplegables ("n elegidos"),
      Agregar / − n +, medio de pago, nota, pie fijo con unidades y total.
      `recordWalkInSale` recibe ítems (sin precios) y llama a
      `record_walk_in_sale`; `getSaleCatalog` arma el catálogo. Probado en
      Chrome a 390px: corte + 2 cocas por transferencia → 2 filas con el mismo
      `sale_id`, $17.000, Caja del día $17.000 (venta de prueba borrada)
- [x] P3 — Verificado en iPhone por el usuario. En escritorio el diálogo se
      desbordaba (heredaba `bottom-0` de la hoja: alto de media pantalla, y
      `overflow-visible`): corregido con `bottom-auto`, 85vh y scroll propio.
      Ventas de prueba de esta etapa borradas a pedido del usuario
- [x] P3 — Diálogo de escritorio verificado por el usuario
- [x] P4 — Caja por categoría en el iPhone (`category-cards.tsx`): tarjetas
      desplegables con cantidad y subtotal; día con cada movimiento, semana y
      mes con conceptos sumados (cantidad × precio, Ef./Tr.). Reemplazan la
      lista, las barras y el calendario de calor; se borró lo que solo usaban
      ellos (`buildDayRevenues`, `bestDay`, `averagePerOpenDay`,
      `getClosedWeekdays`, `monthDateKeys`, `formatCompactAmount`, tokens del
      heatmap). Revisado en Chrome a 390px con septiembre: Cortes $120.000 +
      Otros $6.300 = $126.300
- [x] P4 — Verificado por el usuario en iPhone (desplegables cerrados al entrar)
- [x] P5 — Caja por categoría en escritorio (`category-table.tsx`): total en
      tinta con "N ventas · X servicios y Y productos", efectivo y
      transferencia con % y barra; tabla agrupada desplegable (cerrada al
      entrar): día con cada movimiento, semana/mes con conceptos (cant.,
      precio, efectivo, transferencia, subtotal), "% del total" y fila de
      total. Reemplaza las tres tarjetas y la tabla de movimientos. Revisado
      en Chrome con septiembre (mes $126.300, día 26 $30.300)
- [x] P5 — Verificado por el usuario en escritorio
- [x] P6 — SPEC (ventas sueltas con carrito de catálogo, Caja por categoría) y
      README (migraciones 0011 y 0012, estado actualizado)

## Mejoras de octubre (ver tasks/plan-mejoras-octubre.md)
- [x] Decisiones: las 6 confirmadas (2.: hoja "Agregar cliente" en Más en vez de página Clientes)

### Fase 1 — Reserva pública
- [x] C1 — "Confirmar turno" muestra "Confirmando…" (ícono quieto con Reducir
      movimiento) y deshabilita también "Volver"; los mails 1a y 2a salen con
      `after()`, así el redirect no espera a Resend. Typecheck, lint, 177 tests
      y build OK
- [x] C1 — Verificado por el usuario en el iPhone. En `email_log` el 1a quedó
      `enviado` 0,7 s después de crear el turno (el 2a nunca se registró ahí,
      ya era así antes)
- [x] C2 — Botón "Volver al inicio" (tinta, 44 px, con ←) al final de Turno
      solicitado, solo con `?nuevo=1`. Revisado en Chrome: lleva a `/` y no
      aparece en "Tu turno"
- [x] C3 — Pasar la portada con el dedo la retira, igual que "Reservar turno":
      `BookingLanding` espera a que el scroll se detenga y el dedo no esté
      apoyado, y corrige el scroll restando el alto de la portada
      (`lib/hero-scroll.ts`, 7 tests). Revisado en Chrome con la rueda:
      scroll parcial no hace nada; pasarla la retira sin salto; el botón
      sigue igual
- [x] C3 — Verificado por el usuario en el iPhone
- [x] C4 — Botón flotante de WhatsApp (`whatsapp-fab.tsx`): cuadrado de 56 px
      abajo a la derecha, abre la tarjeta "¿Dudas con tu turno?" con "Abrir
      WhatsApp" (Popover, sin animación ni foco automático). Blanco mientras
      la portada pasa por detrás (`heroIsUnder`, 4 tests), tinta sobre el
      papel. Sin `settings.phone` no aparece; el stepper suma `pb-28` para que
      no tape "Continuar". Revisado en Chrome: abre, cierra con Escape, cambia
      de color al pasar la portada y no se superpone con el pie del paso
- [x] C4 — Verificado por el usuario en el iPhone
- [x] Checkpoint 1 — tests/typecheck/lint/build OK y C1–C4 probados por el usuario en el iPhone

### Fase 2 — Clientes de otra zona
- [x] Z1 — `isBookablePhone` (6 tests): del área, siempre; de otra zona,
      solo si es el de la ficha de ese DNI (escrito de cualquier forma). Lo usan
      `createBooking` y `DniGate`. Probado en local con una ficha de otra zona:
      editar el nombre no muestra el aviso y la reserva entra; otro número de
      otra zona sí lo muestra. Ficha y turno de prueba borrados
- [x] Z2 — El mensaje de "Coordinar por WhatsApp" suma "Mis datos:" con
      nombre, DNI, teléfono y email (los vacíos se omiten).
      `lib/out-of-area-message.ts` (5 tests); `DniGate` pasa lo escrito en
      `Identity.contact`. Revisado en Chrome sin enviar la reserva
- [x] Z3 — Hoja "Agregar cliente" desde Más (`app/admin/mas/add-customer-sheet.tsx`):
      DNI, nombre, teléfono de cualquier zona y email opcional (con la
      aclaración de que sin email no recibe mails). `customerSchema` (8 tests)
      y `addCustomer` (`requireAdmin`; DNI existente → actualiza la ficha; un
      email vacío no borra el que tenía). Tests, typecheck, lint y build OK
- [x] Z3 — Probado en Chrome con sesión de admin: errores en el campo (DNI y
      teléfono), alta con número porteño, DNI repetido con puntos → actualiza
      sin duplicar, y reserva desde la web con ese DNI sin el aviso de zona.
      Dos arreglos: el diálogo de escritorio heredaba media pantalla de alto
      (`sm:bottom-auto`, como Venta suelta) y con un error React vaciaba el
      formulario (`onSubmit` en vez de `action`). Datos de prueba borrados
- [x] Checkpoint 2 — flujo completo con un número de otra provincia, probado
      por el usuario en el iPhone
- [x] H1 — (pedido aparte, tras Z3) Los dos errores de Z3 en el resto de los
      diálogos del panel: `DialogContent` en escritorio suma `bottom-auto`,
      alto máximo 85vh y desplazamiento propio (se sacan los parches de Venta
      suelta y Agregar cliente); "Nuevo servicio", "Bloquear un rango" y la
      ventana de reserva pasan de `action` a `onSubmit` para no vaciarse con
      un error. Revisado en Chrome: Nuevo servicio y el bloqueo conservan lo
      cargado tras el error; Venta suelta sigue igual. Sin tocar: el login y
      "Cancelar turno" (público) tienen el mismo vaciado

### Fase 3 — Estados de carga y error del panel
- [x] L1 — Agenda Día: toolbar inmediato con fecha optimista
      (`AgendaNavigation` + `useOptimistic`), lista a esqueleto en
      `AgendaBody` (4 filas del diseño en el celular, tarjetas en
      escritorio), demora de 200 ms en CSS y mínimo de 400 ms
      (`lib/loading-hold.ts`, 8 tests), flecha tocada en `#f0f1f3`. Título,
      href y paso en `lib/agenda-nav.ts` (9 tests). Sin `Suspense` del
      servidor: decisión escrita en el plan. Comprobado en Chrome con 1,5 s
      de demora temporal (ya sacada), a 500 px y a 1300 px, y también en un
      build de producción (`next start`, con precarga de links): igual
- [x] L1 — Ajuste: la demora de 200 ms arranca solo en el primer toque
      (con toques seguidos el mínimo de 400 ms se podía romper)
- [x] L1 — Verificado por el usuario en el iPhone
- [x] L2 — Agenda Semana, Mes y segmentado Día/Semana/Mes también navegan
      al toque. `WeekView` y `MonthView` pasan a archivos propios sin
      componentes de servidor y con `appointments = null` son su propio
      esqueleto: días y grilla reales desde el primer cuadro, barras donde van
      los turnos (solo las barras esperan los 200 ms, `.hs-reveal-bars`).
      `AgendaBody` elige el esqueleto por la vista recién tocada y pone la
      única región `status`. "Hoy" con borde (diseño) y deshabilitado en el
      período de hoy (`periodContainsToday`, 4 tests). Arreglos: ▶ en Mes iba
      +30 días (salteaba febrero desde el 31 de enero) y ahora va al día 1 del
      mes vecino (4 tests); el día elegido del mes en el celular quedaba en
      el mes anterior al navegar (`key`). Revisado en Chrome con 1,5 s de
      demora temporal (sacada): semana, mes, cambio de vista y "Hoy"; el
      celular solo por DOM (la ventana no se dejó achicar)
- [x] L2 — Verificado por el usuario en el iPhone
- [x] L3 — Navegación por período común (`lib/period-nav.ts`,
      `components/admin/period-navigation.tsx`); las flechas calculan su
      destino en el toque desde la última posición pedida (`stepFrom`)
- [x] L3 — Caja navega al toque (flechas, segmentado, "Hoy" y la píldora de
      fecha): resumen, tarjetas y tabla con modo cargando (etiquetas reales,
      barras en los montos: nunca `$ 0` ni el total anterior). Tarjetas de
      categoría con los anchos del diseño; píldora a .6 si se eligió desde el
      calendario; "Hoy" ghost y en mist cuando el período contiene hoy. El
      `loading.tsx` de la ruta pasa a las tarjetas de categoría (se borra el
      `CajaSkeleton` de filas). ▶ en Mes también va al día 1 (antes +30
      días). Revisado en Chrome con 1,5 s de demora temporal (sacada): día,
      calendario, semana, mes, "Hoy" y escritorio; el celular solo por DOM
- [x] L3 — Verificado por el usuario en el iPhone
- [x] L4 — Más: título y filas se pintan enseguida; `getUser` pasa a
      `SessionCard` dentro de `Suspense` (esqueleto: mail en barra,
      "Sesión de administrador" real, Salir en bloque). Si falla, tarjeta de
      error con tipo y hora y "Reintentar" (`router.refresh()`); las filas
      siguen andando. Sesión vencida → `/login` (`classifySession`, 7 tests).
      Revisado en Chrome con demora y error de red forzados (ya sacados)
- [x] L4 — Verificado por el usuario en el iPhone
- [x] L5 — `loading.tsx` de Servicios, Productos y Disponibilidad: navegación
      inmediata desde Más; ←, textos, encabezados, días de la semana y los
      botones que no necesitan datos ("Nuevo servicio", "Nueva categoría",
      "Bloquear un rango") son reales y funcionan; barras con las medidas del
      diseño donde van los datos (esperan 200 ms). Revisado en Chrome en
      escritorio con 1,5 s de demora temporal (sacada); celular solo por código
- [ ] L5 — Verificar en el iPhone: entrar a Servicios, Productos y Disponibilidad desde Más
- [ ] L6 — Volver a Más con `router.back()` y la fila marcada 600 ms
- [ ] Checkpoint 3 — los 22 artboards revisados en el iPhone

### Fase 4 — Recordatorio para volver (bloqueada por R3 producción)
- [ ] V1 — Migraciones 0013 (valor `vuelta` solo) y 0014 (baja en `customers` + índice único)
- [ ] V2 — Mail 1d "Ya pasó un mes" + variantes en `/dev/emails`
- [ ] V3 — `pickComebacks` con tests + consulta; contar turnos pasados sin cobrar
- [ ] V4 — Baja con token derivado y página `/baja/[token]` con botón (nunca un GET que cambie datos)
- [ ] V5 — Envío dentro del cron diario, aislado del recordatorio del día anterior
- [ ] Checkpoint 4 — mail en Gmail (claro y oscuro), baja probada, primera ejecución en producción
- [ ] F1 — SPEC y README al día
