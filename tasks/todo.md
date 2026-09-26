# Todo — Wireframes móviles del panel admin

## Fase A — Fundaciones compartidas
- [x] Token de blanco (`--hs-white`) + `--card`/`--popover` remapeados
- [x] Punto ámbar del badge pendiente (`amber-500` → `amber-700`)
- [x] `Button`: tamaños táctiles aditivos (`touch`, `touch-lg`, `touch-xl`, `icon-touch`)
- [x] `Dialog` → bottom sheet en mobile, centrado sin cambios en desktop
- [x] `Toaster`: bottom-center + offset 96 en `/admin`, público sin cambios
- [x] Tab bar inferior (`AdminTabBar`) + shell con scroll propio + `/admin/mas`
- [ ] **Verificación manual pendiente** (ver mensaje al usuario)
- [ ] Header "← + título" de Servicios/Disponibilidad en mobile — diferido a
      Fases F/G (es específico de esas pantallas)

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
- [ ] **Verificación manual pendiente** (ver mensaje al usuario)

## Fases E–H (pendientes, ver tasks/plan.md)
- [ ] E — Solicitudes mobile (chips, hoja de rechazo con motivos)
- [ ] F — Servicios mobile (FAB, switch en botón 48×44, `<select>` de duración,
      header "← + título" diferido de la Fase A)
- [ ] G — Disponibilidad mobile (hoja por día, copiar horario, barra de cambios,
      header "← + título" diferido de la Fase A)
- [ ] H — Estados transversales (loading.tsx, error.tsx, toast con reintento)

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
- [ ] T3 — **Verificación manual pendiente** en iPhone (con "Reducir
      movimiento") y desktop
- [ ] T4 — Venta suelta de productos (migración 0008), etiqueta en la lista de Caja
- [ ] T5 — Horario con N bloques (antes/junto con Fase G)
- [ ] T6 — Verde en horarios (hora verde + filete en la lista día de Agenda)
