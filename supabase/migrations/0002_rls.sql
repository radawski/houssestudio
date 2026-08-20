-- =============================================================================
-- HOUSSESTUDIO - Row Level Security
--
-- Modelo de acceso:
--
--   * `anon` NO tiene ninguna politica. El navegador del cliente publico nunca
--     habla directo con Postgres: todo el trafico publico pasa por Server
--     Actions y Route Handlers de Next.js que usan la service_role key del lado
--     del servidor (la service_role saltea RLS por diseno y jamas se expone al
--     browser). Esto deja una sola superficie de entrada que auditar.
--
--   * `authenticated` solo puede operar si tiene fila en `admins`. Un usuario
--     logueado que no sea el barbero no ve absolutamente nada.
--
-- Con RLS activo y cero politicas para anon, la clave anonima publica no da
-- acceso a ninguna tabla aunque se filtre.
-- =============================================================================

-- `security definer` es necesario: sin esto, la politica de `admins` tendria que
-- leer `admins` para autorizarse a leer `admins`, y entra en recursion infinita.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

alter table public.admins         enable row level security;
alter table public.services       enable row level security;
alter table public.business_hours enable row level security;
alter table public.time_blocks    enable row level security;
alter table public.customers      enable row level security;
alter table public.appointments   enable row level security;
alter table public.payments       enable row level security;
alter table public.email_log      enable row level security;
alter table public.settings       enable row level security;

-- Cada admin puede verificar su propia membresia; nadie puede editarla desde la
-- app (altas y bajas se hacen desde el dashboard de Supabase).
drop policy if exists admins_read_self on public.admins;
create policy admins_read_self on public.admins
  for select to authenticated
  using (user_id = auth.uid());

-- Acceso total del barbero sobre el resto del dominio.
do $$
declare
  t text;
begin
  foreach t in array array[
    'services', 'business_hours', 'time_blocks', 'customers',
    'appointments', 'payments', 'email_log', 'settings'
  ] loop
    execute format('drop policy if exists %I on public.%I', t || '_admin_all', t);
    execute format(
      'create policy %I on public.%I for all to authenticated
         using (public.is_admin()) with check (public.is_admin())',
      t || '_admin_all', t
    );
  end loop;
end $$;
