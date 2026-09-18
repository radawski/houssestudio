# HOUSSESTUDIO

Sistema de turnos y gestión comercial para una peluquería de operación
unipersonal: un profesional, una estación de trabajo.

- **Portal público** (`/`, `/reservar`, `/turno/[token]`): el cliente elige
  servicio, día y horario, deja sus datos y recibe un link propio para seguir su
  turno. Sin pago ni seña previa.
- **Panel privado** (`/admin`): agenda, bandeja de solicitudes, catálogo de
  servicios y configuración de disponibilidad.

## Puesta en marcha

### 1. Crear el proyecto de Supabase

1. Entrar a [supabase.com](https://supabase.com) y crear un proyecto (free tier).
   Elegir la región más cercana (`South America (São Paulo)`).
2. Ir a **Project Settings → API** y copiar la URL del proyecto, la clave
   `anon` y la clave `service_role`.

### 2. Configurar las variables de entorno

```bash
cp .env.local.example .env.local
```

Completar `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` y
`SUPABASE_SERVICE_ROLE_KEY`.

> `SUPABASE_SERVICE_ROLE_KEY` saltea todas las políticas de seguridad de la base.
> Nunca se commitea ni se expone al navegador: los módulos que la usan importan
> `server-only`, así que el build falla si alguna vez terminan alcanzados por
> código de cliente.

### 3. Aplicar el esquema

En el **SQL Editor** de Supabase, ejecutar en orden los archivos de
`supabase/migrations/`:

1. `0001_schema.sql` — tablas, tipos y la restricción anti-solapamiento.
2. `0002_rls.sql` — Row Level Security.
3. `0003_seed.sql` — servicios y horario comercial iniciales.

### 4. Crear el usuario del barbero

No hay registro público: la cuenta se crea a mano.

1. **Authentication → Users → Add user**, con email y contraseña.
2. Copiar el `User UID` y habilitarlo como administrador desde el SQL Editor:

```sql
insert into public.admins (user_id) values ('<pegar-el-user-uid>');
```

### 5. Levantar la aplicación

```bash
npm run dev
```

El portal público queda en `http://localhost:3000` y el panel en
`http://localhost:3000/admin`.

## Comandos

```bash
npm run dev
```

```bash
npm test
```

```bash
npm run typecheck
```

```bash
npm run build
```

## Cómo está armado

| Capa | Ubicación |
|---|---|
| Motor de disponibilidad | [`lib/availability.ts`](lib/availability.ts) — función pura, cubierta por tests |
| Lecturas del portal público | [`lib/data/availability.ts`](lib/data/availability.ts), [`lib/data/public.ts`](lib/data/public.ts) |
| Lecturas del panel | [`lib/data/appointments.ts`](lib/data/appointments.ts) |
| Escrituras | [`lib/actions/`](lib/actions) — una Server Action por dominio |
| Esquema | [`supabase/migrations/`](supabase/migrations) |

Tres decisiones que conviene conocer antes de tocar el código:

**Los horarios se encadenan según la duración del servicio.** Dentro de cada
hueco libre los slots arrancan en el borde del hueco y avanzan de a la duración
del servicio elegido. Aprovecha mejor la agenda de una estación única, y trae
como consecuencia que los horarios ofrecidos cambien según el servicio — por eso
el flujo de reserva pide el servicio antes que la hora.

**El portal público nunca habla directo con Postgres.** RLS está activo en todas
las tablas y `anon` no tiene ninguna política. Todo el tráfico público pasa por
Server Actions que usan la `service_role` del lado del servidor, así que hay una
sola superficie de entrada que auditar.

**Contra el doble booking manda la base, no el frontend.** Una restricción de
exclusión GiST sobre el rango de cada turno impide dos turnos activos
solapados. La validación previa mejora el mensaje de error, pero entre leer la
disponibilidad y escribir el turno siempre hay una ventana: la que cierra la
base.

## Zona horaria

Todo se guarda en UTC (`timestamptz`) y se muestra en
`America/Argentina/Buenos_Aires`. Las fechas de agenda se identifican por su
clave local `yyyy-MM-dd` y no por un `Date`, porque un `Date` arrastra una hora
que al cruzar zonas corre los turnos de día.

## Estado

**Fase 1 completa**: reservas públicas, agenda, solicitudes, servicios y
disponibilidad.

**Fase 2 en curso** (ver `SPEC.md`): emails transaccionales (confirmación,
aviso interno y notificación de cancelación) y autogestión de cancelaciones
desde `/turno/[token]` ya funcionan, vía Resend.

Pendiente de Fase 2: cobros y cierre de caja.
Pendiente de Fase 3: CRM, reportes y recordatorios automáticos.
