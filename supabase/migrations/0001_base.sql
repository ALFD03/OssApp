-- =============================================================================
-- Fase 1 - Esquema base: dojos y usuarios.
--
-- Convenciones que rigen para TODAS las tablas de fases posteriores:
--   * toda tabla acotada a un dojo lleva dojo_id NOT NULL + indice por dojo_id;
--   * las marcas de tiempo se llaman creado_el / actualizado_el;
--   * actualizado_el lo mantiene el trigger app.tocar_actualizado_el().
-- =============================================================================

create schema if not exists app;
comment on schema app is 'Funciones internas de OssApp (helpers de RLS, triggers). No se expone via API.';

revoke all on schema app from public, anon, authenticated;
grant usage on schema app to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Enumeraciones
-- -----------------------------------------------------------------------------

-- Debe coincidir con ROLES en packages/core/src/roles.ts
create type public.rol_usuario as enum ('superadmin', 'maestro', 'sensei', 'representante', 'alumno');

-- Debe coincidir con ESTADOS_LICENCIA en packages/core/src/roles.ts
create type public.estado_licencia as enum ('activa', 'prueba', 'suspendida', 'vencida');

-- -----------------------------------------------------------------------------
-- Trigger reutilizable de actualizado_el
-- -----------------------------------------------------------------------------

create or replace function app.tocar_actualizado_el()
returns trigger
language plpgsql
as $$
begin
  new.actualizado_el := now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- dojos  (tenant)
-- -----------------------------------------------------------------------------

create table public.dojos (
  id                uuid primary key default gen_random_uuid(),
  nombre            text not null check (length(btrim(nombre)) between 2 and 120),
  slug              text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  estado_licencia   public.estado_licencia not null default 'prueba',
  licencia_vence_el date,
  activo            boolean not null default true,
  creado_el         timestamptz not null default now(),
  actualizado_el    timestamptz not null default now()
);

comment on table public.dojos is 'Tenant del sistema. Todo dato operativo cuelga de un dojo.';

create trigger dojos_actualizado_el
  before update on public.dojos
  for each row execute function app.tocar_actualizado_el();

-- -----------------------------------------------------------------------------
-- usuarios  (perfil de aplicacion, 1:1 con auth.users)
-- -----------------------------------------------------------------------------

create table public.usuarios (
  id             uuid primary key references auth.users (id) on delete cascade,
  dojo_id        uuid references public.dojos (id) on delete cascade,
  rol            public.rol_usuario not null,
  nombre         text not null check (length(btrim(nombre)) between 1 and 80),
  apellido       text not null check (length(btrim(apellido)) between 1 and 80),
  email          text not null,
  telefono       text,
  activo         boolean not null default true,
  creado_el      timestamptz not null default now(),
  actualizado_el timestamptz not null default now(),

  -- El superadmin es el unico rol sin dojo; cualquier otro rol exige dojo_id.
  constraint usuarios_dojo_segun_rol check (
    (rol = 'superadmin' and dojo_id is null) or
    (rol <> 'superadmin' and dojo_id is not null)
  )
);

comment on table public.usuarios is 'Perfil de aplicacion. El rol y el dojo_id de esta tabla son la fuente de verdad de RLS.';
comment on column public.usuarios.dojo_id is 'NULL solo para superadmin (ver usuarios_dojo_segun_rol).';

create index usuarios_dojo_id_idx on public.usuarios (dojo_id);
create index usuarios_dojo_rol_idx on public.usuarios (dojo_id, rol);
create unique index usuarios_email_unico_idx on public.usuarios (lower(email));

create trigger usuarios_actualizado_el
  before update on public.usuarios
  for each row execute function app.tocar_actualizado_el();

-- -----------------------------------------------------------------------------
-- Alta automatica del perfil al crear el usuario en Auth
--
-- Evita perfiles huerfanos: sin fila en usuarios, RLS no reconoce rol ni dojo y
-- la cuenta no puede leer absolutamente nada.
-- -----------------------------------------------------------------------------

create or replace function app.crear_perfil_de_usuario()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_rol     public.rol_usuario;
  v_dojo_id uuid;
begin
  -- Sin metadatos de rol no se crea perfil: el alta la completara el maestro
  -- o el superadmin desde la app.
  if new.raw_user_meta_data ->> 'rol' is null then
    return new;
  end if;

  v_rol := (new.raw_user_meta_data ->> 'rol')::public.rol_usuario;
  v_dojo_id := nullif(new.raw_user_meta_data ->> 'dojo_id', '')::uuid;

  insert into public.usuarios (id, dojo_id, rol, nombre, apellido, email, telefono)
  values (
    new.id,
    case when v_rol = 'superadmin' then null else v_dojo_id end,
    v_rol,
    coalesce(nullif(btrim(new.raw_user_meta_data ->> 'nombre'), ''), 'Sin'),
    coalesce(nullif(btrim(new.raw_user_meta_data ->> 'apellido'), ''), 'nombre'),
    new.email,
    nullif(btrim(new.raw_user_meta_data ->> 'telefono'), '')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function app.crear_perfil_de_usuario();
