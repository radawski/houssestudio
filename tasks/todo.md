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

## Fase 3 (sin especificar todavía)
- [ ] CRM, reportes y recordatorios automáticos (estos usan E4/E5)
