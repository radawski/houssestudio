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

Generar también `MANAGE_TOKEN_SECRET`, con el que se derivan los links de
autogestión (`/turno/[token]`) a partir del id de cada turno:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

> `MANAGE_TOKEN_SECRET` tiene que tener **el mismo valor** en `.env.local` y en
> Vercel: los dos entornos usan la misma base, y un turno reservado en uno
> puede recibir emails armados en el otro. Si cambia, los links de los turnos
> ya reservados dejan de coincidir.

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
4. `0004_dni.sql` — DNI como identidad del cliente.
5. `0005_ventana_de_reserva.sql` — ventana de reserva configurable.
6. `0006_horario_partido.sql` — segundo tramo horario (reemplazado por la 0009).
7. `0007_ventas_sueltas.sql` — ventas sueltas y cobro atómico de turnos.
8. `0008_ventas_productos.sql` — venta de productos además de servicios.
9. `0009_horario_bloques.sql` — horario con N bloques por día.
10. `0010_retira_columnas_horario.sql` — retira las columnas de horario
    anteriores a la 0009.
11. `0011_email_aceptacion.sql` — tipo de email para el turno confirmado.
12. `0012_productos_y_categorias.sql` — categorías y productos, ventas
    sueltas con varios ítems y la función que las registra.

Cada archivo depende de los anteriores: la 0009 copia a bloques el horario
que dejan cargado la 0003 y la 0006, y la 0010 recién después borra esas
columnas.

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

**Fase 2 completa** (ver `SPEC.md`): emails transaccionales con el diseño de
la web, autogestión de cancelaciones, registro de cobros, venta suelta con
carrito de catálogo, productos con categorías y cierre de caja por categoría.

**Pendiente** (ver `tasks/todo.md`): Fase 3, solo recordatorios automáticos;
dominio propio para los emails. CRM y reportes quedan para más adelante.
