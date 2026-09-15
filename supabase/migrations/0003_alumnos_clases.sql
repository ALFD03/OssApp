-- =============================================================================
-- Fase 2 - Alumnos, clases y horarios.
--
-- Nota sobre el superadmin: NO recibe politicas sobre estas tablas. Su alcance
-- es licencias, soporte y metricas agregadas (spec seccion 4.5), no los datos
-- operativos de cada dojo.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Helpers adicionales de RLS
-- -----------------------------------------------------------------------------

-- Maestro o sensei: quien opera el dojo desde la app Staff.
create or replace function app.es_staff()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(app.rol_actual() in ('maestro', 'sensei'), false);
$$;

create type public.nivel_clase as enum ('infantil', 'juvenil', 'adultos', 'mixto', 'competicion');

-- -----------------------------------------------------------------------------
-- alumnos
--
-- usuario_id es opcional: un alumno pequeno puede no tener cuenta propia y
-- existir solo a traves de su representante.
-- -----------------------------------------------------------------------------

create table public.alumnos (
  id                uuid primary key default gen_random_uuid(),
  dojo_id           uuid not null references public.dojos (id) on delete cascade,
  usuario_id        uuid references public.usuarios (id) on delete set null,
  nombre            text not null check (length(btrim(nombre)) between 1 and 80),
  apellido          text not null check (length(btrim(apellido)) between 1 and 80),
  fecha_nacimiento  date,
  fecha_ingreso     date not null default current_date,
  activo            boolean not null default true,
  notas             text,
  creado_el         timestamptz not null default now(),
  actualizado_el    timestamptz not null default now()
);

comment on column public.alumnos.usuario_id is 'Cuenta propia del alumno. NULL si solo accede a traves de su representante.';

create index alumnos_dojo_id_idx on public.alumnos (dojo_id);
create unique index alumnos_usuario_id_idx on public.alumnos (usuario_id) where usuario_id is not null;

create trigger alumnos_actualizado_el
  before update on public.alumnos
  for each row execute function app.tocar_actualizado_el();

-- -----------------------------------------------------------------------------
-- representante_alumno  (N:N)
-- -----------------------------------------------------------------------------

create table public.representante_alumno (
  dojo_id          uuid not null references public.dojos (id) on delete cascade,
  representante_id uuid not null references public.usuarios (id) on delete cascade,
  alumno_id        uuid not null references public.alumnos (id) on delete cascade,
  parentesco       text,
  creado_el        timestamptz not null default now(),
  primary key (representante_id, alumno_id)
);

create index representante_alumno_alumno_idx on public.representante_alumno (alumno_id);
create index representante_alumno_dojo_idx on public.representante_alumno (dojo_id);

-- -----------------------------------------------------------------------------
-- clases y horarios
-- -----------------------------------------------------------------------------

create table public.clases (
  id             uuid primary key default gen_random_uuid(),
  dojo_id        uuid not null references public.dojos (id) on delete cascade,
  sensei_id      uuid references public.usuarios (id) on delete set null,
  nombre         text not null check (length(btrim(nombre)) between 2 and 120),
  nivel          public.nivel_clase not null default 'mixto',
  capacidad      int check (capacidad is null or capacidad > 0),
  activa         boolean not null default true,
  creado_el      timestamptz not null default now(),
  actualizado_el timestamptz not null default now()
);

create index clases_dojo_id_idx on public.clases (dojo_id);
create index clases_sensei_idx on public.clases (sensei_id);

create trigger clases_actualizado_el
  before update on public.clases
  for each row execute function app.tocar_actualizado_el();

-- Un horario es una franja semanal recurrente. Es la tabla contra la que la
-- Fase 3 validara que un escaneo de QR cae dentro de una clase activa.
create table public.horarios (
  id          uuid primary key default gen_random_uuid(),
  dojo_id     uuid not null references public.dojos (id) on delete cascade,
  clase_id    uuid not null references public.clases (id) on delete cascade,
  dia_semana  smallint not null check (dia_semana between 0 and 6),
  hora_inicio time not null,
  hora_fin    time not null,
  creado_el   timestamptz not null default now(),
  constraint horarios_franja_valida check (hora_fin > hora_inicio),
  constraint horarios_sin_duplicados unique (clase_id, dia_semana, hora_inicio)
);

comment on column public.horarios.dia_semana is '0 = domingo … 6 = sabado, igual que EXTRACT(DOW).';

create index horarios_dojo_dia_idx on public.horarios (dojo_id, dia_semana);

create table public.clase_alumno (
  dojo_id           uuid not null references public.dojos (id) on delete cascade,
  clase_id          uuid not null references public.clases (id) on delete cascade,
  alumno_id         uuid not null references public.alumnos (id) on delete cascade,
  fecha_inscripcion date not null default current_date,
  primary key (clase_id, alumno_id)
);

create index clase_alumno_alumno_idx on public.clase_alumno (alumno_id);
create index clase_alumno_dojo_idx on public.clase_alumno (dojo_id);

-- -----------------------------------------------------------------------------
-- Coherencia de dojo entre tablas relacionadas
--
-- Sin esto se podria enlazar un alumno de un dojo con una clase de otro
-- saltandose el aislamiento por la puerta de atras.
-- -----------------------------------------------------------------------------

create or replace function app.validar_coherencia_dojo()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_dojo_alumno uuid;
  v_dojo_clase  uuid;
  v_dojo_user   uuid;
begin
  if tg_table_name = 'clase_alumno' then
    select dojo_id into v_dojo_alumno from public.alumnos where id = new.alumno_id;
    select dojo_id into v_dojo_clase  from public.clases  where id = new.clase_id;
    if v_dojo_alumno is distinct from new.dojo_id or v_dojo_clase is distinct from new.dojo_id then
      raise exception 'El alumno y la clase deben pertenecer al mismo dojo' using errcode = '23514';
    end if;

  elsif tg_table_name = 'horarios' then
    select dojo_id into v_dojo_clase from public.clases where id = new.clase_id;
    if v_dojo_clase is distinct from new.dojo_id then
      raise exception 'El horario y la clase deben pertenecer al mismo dojo' using errcode = '23514';
    end if;

  elsif tg_table_name = 'representante_alumno' then
    select dojo_id into v_dojo_alumno from public.alumnos  where id = new.alumno_id;
    select dojo_id into v_dojo_user   from public.usuarios where id = new.representante_id;
    if v_dojo_alumno is distinct from new.dojo_id or v_dojo_user is distinct from new.dojo_id then
      raise exception 'El representante y el alumno deben pertenecer al mismo dojo' using errcode = '23514';
    end if;

  -- Los accesos a campos de NEW van anidados, no en la condicion del ELSIF:
  -- PL/pgSQL resuelve el campo aunque la rama no corresponda a esta tabla.
  elsif tg_table_name = 'clases' then
    if new.sensei_id is not null then
      select dojo_id into v_dojo_user from public.usuarios where id = new.sensei_id;
      if v_dojo_user is distinct from new.dojo_id then
        raise exception 'El sensei debe pertenecer al mismo dojo que la clase' using errcode = '23514';
      end if;
    end if;

  elsif tg_table_name = 'alumnos' then
    if new.usuario_id is not null then
      select dojo_id into v_dojo_user from public.usuarios where id = new.usuario_id;
      if v_dojo_user is distinct from new.dojo_id then
        raise exception 'La cuenta debe pertenecer al mismo dojo que el alumno' using errcode = '23514';
      end if;
    end if;
  end if;

  return new;
end;
$$;

create trigger clase_alumno_coherencia before insert or update on public.clase_alumno
  for each row execute function app.validar_coherencia_dojo();
create trigger horarios_coherencia before insert or update on public.horarios
  for each row execute function app.validar_coherencia_dojo();
create trigger representante_alumno_coherencia before insert or update on public.representante_alumno
  for each row execute function app.validar_coherencia_dojo();
create trigger clases_coherencia before insert or update on public.clases
  for each row execute function app.validar_coherencia_dojo();
create trigger alumnos_coherencia before insert or update on public.alumnos
  for each row execute function app.validar_coherencia_dojo();
