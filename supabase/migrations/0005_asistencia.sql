-- =============================================================================
-- Fase 3 - Asistencia por QR fijo, con respaldo de marcado manual.
--
-- Dos decisiones que rigen toda la fase:
--   1. El QR es FIJO (spec seccion 8: la rotacion de token queda fuera del MVP).
--      Por eso el token por si solo no autoriza nada: la validacion de que el
--      escaneo cae dentro de una clase activa se hace EN EL SERVIDOR.
--   2. La escritura es idempotente. El marcado offline reintenta con el mismo
--      client_id y no duplica asistencias.
-- =============================================================================

create type public.origen_asistencia as enum ('qr', 'manual');

-- -----------------------------------------------------------------------------
-- codigos_qr
--
-- clase_id NULL = QR del dojo entero (sirve para cualquier clase que este en
-- horario). Con clase_id = QR de esa clase concreta, para dojos con varias salas.
-- -----------------------------------------------------------------------------

create table public.codigos_qr (
  id        uuid primary key default gen_random_uuid(),
  dojo_id   uuid not null references public.dojos (id) on delete cascade,
  clase_id  uuid references public.clases (id) on delete cascade,
  token     text not null unique default encode(gen_random_bytes(16), 'hex'),
  etiqueta  text not null default 'Entrada principal',
  activo    boolean not null default true,
  creado_el timestamptz not null default now()
);

comment on table public.codigos_qr is 'QR impreso una sola vez. El token no autoriza por si mismo: ver registrar_asistencia_qr().';

create index codigos_qr_dojo_idx on public.codigos_qr (dojo_id);

-- -----------------------------------------------------------------------------
-- asistencias
-- -----------------------------------------------------------------------------

create table public.asistencias (
  id             uuid primary key default gen_random_uuid(),
  dojo_id        uuid not null references public.dojos (id) on delete cascade,
  alumno_id      uuid not null references public.alumnos (id) on delete cascade,
  clase_id       uuid not null references public.clases (id) on delete cascade,
  fecha          date not null default current_date,
  hora           timestamptz not null default now(),
  origen         public.origen_asistencia not null,
  registrado_por uuid references public.usuarios (id) on delete set null,
  -- Identificador generado por el cliente ANTES de enviar. Es lo que permite
  -- reintentar una sincronizacion offline sin duplicar la fila.
  client_id      uuid not null default gen_random_uuid(),
  creado_el      timestamptz not null default now(),

  constraint asistencias_una_por_dia unique (alumno_id, clase_id, fecha),
  constraint asistencias_client_id_unico unique (client_id)
);

create index asistencias_dojo_fecha_idx on public.asistencias (dojo_id, fecha desc);
create index asistencias_clase_fecha_idx on public.asistencias (clase_id, fecha desc);
create index asistencias_alumno_idx on public.asistencias (alumno_id, fecha desc);

create trigger asistencias_coherencia before insert or update on public.asistencias
  for each row execute function app.validar_coherencia_dojo();

-- -----------------------------------------------------------------------------
-- Clase activa en un momento dado
--
-- Tolerancia: se admite marcar desde 30 min antes del inicio hasta el final de
-- la clase. Sin margen, quien llega puntual no llega a tiempo de marcar.
-- -----------------------------------------------------------------------------

create or replace function app.clase_activa_ahora(p_dojo_id uuid, p_clase_id uuid default null)
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select h.clase_id
  from public.horarios h
  join public.clases c on c.id = h.clase_id
  where h.dojo_id = p_dojo_id
    and c.activa
    and (p_clase_id is null or h.clase_id = p_clase_id)
    and h.dia_semana = extract(dow from current_date)::smallint
    and localtime between (h.hora_inicio - interval '30 minutes') and h.hora_fin
  order by h.hora_inicio
  limit 1;
$$;

-- -----------------------------------------------------------------------------
-- registrar_asistencia_qr
--
-- Unico camino por el que la app Familias registra asistencia. Es SECURITY
-- DEFINER porque tiene que resolver el token y el horario, cosas que el cliente
-- no puede ver; a cambio comprueba explicitamente que quien llama tenga derecho
-- sobre ese alumno.
-- -----------------------------------------------------------------------------

create or replace function public.registrar_asistencia_qr(
  p_token     text,
  p_alumno_id uuid,
  p_client_id uuid default null
)
returns public.asistencias
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_qr       public.codigos_qr;
  v_alumno   public.alumnos;
  v_clase_id uuid;
  v_fila     public.asistencias;
begin
  select * into v_qr from public.codigos_qr where token = p_token and activo;
  if not found then
    raise exception 'Codigo QR no valido o desactivado' using errcode = 'P0002';
  end if;

  select * into v_alumno from public.alumnos where id = p_alumno_id and activo;
  if not found then
    raise exception 'El alumno no existe o esta inactivo' using errcode = 'P0002';
  end if;

  -- El QR de un dojo no sirve para un alumno de otro.
  if v_alumno.dojo_id is distinct from v_qr.dojo_id then
    raise exception 'Este QR no pertenece al dojo del alumno' using errcode = '42501';
  end if;

  -- Quien llama debe ser el propio alumno o uno de sus representantes.
  --
  -- El coalesce no es cosmetico: un alumno sin cuenta propia tiene usuario_id
  -- NULL, la comparacion da NULL y `not NULL` es NULL, que un IF trata como
  -- falso. Sin esto, cualquiera del dojo podria marcar por esos alumnos.
  if not (
    coalesce(v_alumno.usuario_id = auth.uid(), false)
    or coalesce(app.es_representante_de(p_alumno_id), false)
  ) then
    raise exception 'No puedes registrar asistencia por este alumno' using errcode = '42501';
  end if;

  v_clase_id := app.clase_activa_ahora(v_qr.dojo_id, v_qr.clase_id);
  if v_clase_id is null then
    raise exception 'No hay ninguna clase activa en este horario' using errcode = 'P0002';
  end if;

  if not exists (
    select 1 from public.clase_alumno ca
    where ca.clase_id = v_clase_id and ca.alumno_id = p_alumno_id
  ) then
    raise exception 'El alumno no esta inscrito en la clase de este horario' using errcode = 'P0002';
  end if;

  insert into public.asistencias (dojo_id, alumno_id, clase_id, origen, registrado_por, client_id)
  values (
    v_qr.dojo_id, p_alumno_id, v_clase_id, 'qr', auth.uid(),
    coalesce(p_client_id, gen_random_uuid())
  )
  on conflict on constraint asistencias_una_por_dia do nothing
  returning * into v_fila;

  -- Ya estaba marcada hoy: se devuelve la existente en vez de fallar. Marcar
  -- dos veces no es un error para quien escanea.
  if v_fila.id is null then
    select * into v_fila
    from public.asistencias
    where alumno_id = p_alumno_id and clase_id = v_clase_id and fecha = current_date;
  end if;

  return v_fila;
end;
$$;

revoke execute on function public.registrar_asistencia_qr(text, uuid, uuid) from public, anon;
grant execute on function public.registrar_asistencia_qr(text, uuid, uuid) to authenticated;

revoke execute on function app.clase_activa_ahora(uuid, uuid) from public, anon;
grant execute on function app.clase_activa_ahora(uuid, uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- Todo dojo nace con su QR de entrada.
--
-- Sin codigo no se puede marcar asistencia, asi que no se deja como un paso
-- manual que el maestro pueda olvidar.
-- -----------------------------------------------------------------------------

create or replace function app.crear_qr_por_defecto()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.codigos_qr (dojo_id, etiqueta)
  values (new.id, 'Entrada principal');
  return new;
end;
$$;

create trigger dojos_qr_por_defecto
  after insert on public.dojos
  for each row execute function app.crear_qr_por_defecto();
