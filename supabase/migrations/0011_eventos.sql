-- =============================================================================
-- Fase 6 - Eventos e inscripciones.
--
-- Reutiliza el MISMO flujo de verificacion manual que los pagos (spec seccion
-- 4.4): si el evento tiene costo, la inscripcion entra pendiente con su
-- comprobante y un maestro la aprueba.
-- =============================================================================

create type public.tipo_evento as enum ('torneo', 'seminario', 'examen_especial', 'otro');

create table public.eventos (
  id             uuid primary key default gen_random_uuid(),
  dojo_id        uuid not null references public.dojos (id) on delete cascade,
  nombre         text not null check (length(btrim(nombre)) between 2 and 140),
  descripcion    text,
  tipo           public.tipo_evento not null default 'otro',
  fecha          date not null,
  hora           time,
  lugar          text,
  cupo           int check (cupo is null or cupo > 0),
  costo          numeric(12, 2) not null default 0 check (costo >= 0),
  moneda         text not null default 'USD',
  activo         boolean not null default true,
  creado_por     uuid references public.usuarios (id) on delete set null,
  creado_el      timestamptz not null default now(),
  actualizado_el timestamptz not null default now()
);

comment on column public.eventos.cupo is 'NULL = sin limite de plazas.';
comment on column public.eventos.costo is '0 = gratuito; la inscripcion no pide comprobante.';

create index eventos_dojo_fecha_idx on public.eventos (dojo_id, fecha desc);

create trigger eventos_actualizado_el
  before update on public.eventos
  for each row execute function app.tocar_actualizado_el();

create trigger eventos_coherencia before insert or update on public.eventos
  for each row execute function app.validar_coherencia_dojo();

-- -----------------------------------------------------------------------------
-- inscripciones
-- -----------------------------------------------------------------------------

create table public.inscripciones (
  id              uuid primary key default gen_random_uuid(),
  dojo_id         uuid not null references public.dojos (id) on delete cascade,
  evento_id       uuid not null references public.eventos (id) on delete cascade,
  alumno_id       uuid not null references public.alumnos (id) on delete cascade,
  inscrito_por    uuid references public.usuarios (id) on delete set null,

  -- Flujo de verificacion manual, identico al de `pagos`.
  comprobante_url text,
  estado          public.estado_verificacion not null default 'pendiente',
  motivo_rechazo  text,
  verificado_por  uuid references public.usuarios (id) on delete set null,
  verificado_el   timestamptz,

  creado_el       timestamptz not null default now(),
  actualizado_el  timestamptz not null default now(),

  constraint inscripciones_sin_duplicado unique (evento_id, alumno_id),
  constraint inscripciones_rechazo_con_motivo check (
    estado <> 'rechazado' or (motivo_rechazo is not null and length(btrim(motivo_rechazo)) > 0)
  ),
  constraint inscripciones_verificado_coherente check (
    (estado = 'pendiente' and verificado_el is null)
    or (estado <> 'pendiente' and verificado_el is not null)
  )
);

create index inscripciones_evento_idx on public.inscripciones (evento_id);
create index inscripciones_alumno_idx on public.inscripciones (alumno_id);

create trigger inscripciones_actualizado_el
  before update on public.inscripciones
  for each row execute function app.tocar_actualizado_el();

create trigger inscripciones_coherencia before insert or update on public.inscripciones
  for each row execute function app.validar_coherencia_dojo();

create trigger inscripciones_sellar_verificacion
  before update on public.inscripciones
  for each row execute function app.sellar_verificacion();

-- -----------------------------------------------------------------------------
-- Control de cupo
--
-- Se hace en el servidor, no contando filas en el cliente: dos personas pueden
-- inscribirse a la vez y el cliente no tiene forma de evitar la carrera.
-- -----------------------------------------------------------------------------

create or replace function app.validar_cupo_evento()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_evento public.eventos;
  v_ocupadas int;
begin
  select * into v_evento from public.eventos where id = new.evento_id;

  if not found or not v_evento.activo then
    raise exception 'El evento no existe o no esta activo' using errcode = 'P0002';
  end if;

  if v_evento.fecha < current_date then
    raise exception 'El evento ya paso' using errcode = 'P0002';
  end if;

  if v_evento.cupo is not null then
    -- Las rechazadas no ocupan plaza; las pendientes si, para no vender dos
    -- veces el mismo sitio mientras el maestro verifica.
    select count(*) into v_ocupadas
    from public.inscripciones i
    where i.evento_id = new.evento_id and i.estado <> 'rechazado' and i.id <> new.id;

    if v_ocupadas >= v_evento.cupo then
      raise exception 'El evento ya no tiene cupo disponible' using errcode = 'P0002';
    end if;
  end if;

  return new;
end;
$$;

create trigger inscripciones_validar_cupo
  before insert on public.inscripciones
  for each row execute function app.validar_cupo_evento();

-- -----------------------------------------------------------------------------
-- Eventos con plazas ocupadas, para listarlos sin N+1 consultas.
-- -----------------------------------------------------------------------------

create or replace view public.vista_eventos
with (security_invoker = true)
as
select
  e.*,
  (select count(*) from public.inscripciones i
    where i.evento_id = e.id and i.estado <> 'rechazado')::int as inscritos,
  case
    when e.cupo is null then null
    else greatest(e.cupo - (select count(*) from public.inscripciones i
                             where i.evento_id = e.id and i.estado <> 'rechazado')::int, 0)
  end as plazas_libres
from public.eventos e;
