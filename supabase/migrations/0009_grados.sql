-- =============================================================================
-- Fase 5 - Grados, cinturones, examenes y certificados.
--
-- El cinturon actual del alumno NO se edita a mano: lo mueve el trigger cuando
-- se registra un examen aprobado. Asi el historial y el estado no se separan.
-- =============================================================================

create type public.resultado_examen as enum ('aprobado', 'reprobado');

-- -----------------------------------------------------------------------------
-- cinturones
--
-- Cada dojo define su propia escala: `orden` ascendente es el avance.
-- -----------------------------------------------------------------------------

create table public.cinturones (
  id        uuid primary key default gen_random_uuid(),
  dojo_id   uuid not null references public.dojos (id) on delete cascade,
  nombre    text not null check (length(btrim(nombre)) between 1 and 60),
  color     text not null default '#FFFFFF' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  orden     smallint not null check (orden >= 0),
  creado_el timestamptz not null default now(),

  constraint cinturones_orden_unico unique (dojo_id, orden),
  constraint cinturones_nombre_unico unique (dojo_id, nombre)
);

create index cinturones_dojo_idx on public.cinturones (dojo_id, orden);

-- El cinturon actual se anade aqui, con la tabla a la que apunta ya creada.
alter table public.alumnos
  add column cinturon_actual_id uuid references public.cinturones (id) on delete set null,
  add column cinturon_desde date;

comment on column public.alumnos.cinturon_actual_id is 'Lo actualiza el trigger de examenes aprobados, no la app.';

-- -----------------------------------------------------------------------------
-- requisitos_grado
-- -----------------------------------------------------------------------------

create table public.requisitos_grado (
  id                              uuid primary key default gen_random_uuid(),
  dojo_id                         uuid not null references public.dojos (id) on delete cascade,
  cinturon_id                     uuid not null references public.cinturones (id) on delete cascade,
  asistencias_minimas             int not null default 0 check (asistencias_minimas >= 0),
  meses_minimos_en_grado_anterior int not null default 0 check (meses_minimos_en_grado_anterior >= 0),
  requiere_solvencia              boolean not null default true,
  creado_el                       timestamptz not null default now(),
  actualizado_el                  timestamptz not null default now(),

  constraint requisitos_por_cinturon unique (cinturon_id)
);

create trigger requisitos_actualizado_el
  before update on public.requisitos_grado
  for each row execute function app.tocar_actualizado_el();

-- -----------------------------------------------------------------------------
-- examenes
-- -----------------------------------------------------------------------------

create table public.examenes (
  id                  uuid primary key default gen_random_uuid(),
  dojo_id             uuid not null references public.dojos (id) on delete cascade,
  alumno_id           uuid not null references public.alumnos (id) on delete cascade,
  cinturon_destino_id uuid not null references public.cinturones (id) on delete restrict,
  fecha               date not null default current_date,
  resultado           public.resultado_examen not null,
  evaluador_id        uuid references public.usuarios (id) on delete set null,
  observaciones       text,
  creado_el           timestamptz not null default now(),

  constraint examenes_sin_duplicado unique (alumno_id, cinturon_destino_id, fecha)
);

create index examenes_dojo_fecha_idx on public.examenes (dojo_id, fecha desc);
create index examenes_alumno_idx on public.examenes (alumno_id, fecha desc);

-- -----------------------------------------------------------------------------
-- certificados
--
-- `codigo` es el identificador publico verificable que se imprime en el
-- documento. No se expone el id interno.
-- -----------------------------------------------------------------------------

create table public.certificados (
  id         uuid primary key default gen_random_uuid(),
  dojo_id    uuid not null references public.dojos (id) on delete cascade,
  examen_id  uuid not null references public.examenes (id) on delete cascade unique,
  alumno_id  uuid not null references public.alumnos (id) on delete cascade,
  codigo     text not null unique default upper(encode(gen_random_bytes(6), 'hex')),
  emitido_el timestamptz not null default now()
);

create index certificados_alumno_idx on public.certificados (alumno_id);

-- -----------------------------------------------------------------------------
-- Al aprobar un examen: sube el cinturon y emite el certificado
-- -----------------------------------------------------------------------------

create or replace function app.aplicar_examen_aprobado()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_orden_destino smallint;
  v_orden_actual  smallint;
begin
  if new.resultado <> 'aprobado' then
    return new;
  end if;

  select c.orden into v_orden_destino from public.cinturones c where c.id = new.cinturon_destino_id;
  select c.orden into v_orden_actual
  from public.alumnos a
  left join public.cinturones c on c.id = a.cinturon_actual_id
  where a.id = new.alumno_id;

  -- Solo se avanza. Reaprobar un grado inferior no degrada al alumno.
  if v_orden_actual is null or v_orden_destino > v_orden_actual then
    update public.alumnos
    set cinturon_actual_id = new.cinturon_destino_id,
        cinturon_desde = new.fecha
    where id = new.alumno_id;
  end if;

  insert into public.certificados (dojo_id, examen_id, alumno_id)
  values (new.dojo_id, new.id, new.alumno_id)
  on conflict (examen_id) do nothing;

  return new;
end;
$$;

create trigger examenes_aplicar_aprobado
  after insert on public.examenes
  for each row execute function app.aplicar_examen_aprobado();

create trigger examenes_coherencia before insert or update on public.examenes
  for each row execute function app.validar_coherencia_dojo();

-- -----------------------------------------------------------------------------
-- Elegibilidad para el siguiente grado
--
-- Devuelve el progreso contra los requisitos definidos por el maestro. Es una
-- funcion y no una vista porque depende del alumno concreto y de su historial.
-- -----------------------------------------------------------------------------

create or replace function public.progreso_de_grado(p_alumno_id uuid)
returns table (
  cinturon_actual      text,
  siguiente_cinturon   text,
  siguiente_id         uuid,
  asistencias          int,
  asistencias_minimas  int,
  meses_en_grado       int,
  meses_minimos        int,
  requiere_solvencia   boolean,
  solvente             boolean,
  elegible             boolean
)
language sql
stable
security invoker
as $$
  with alumno as (
    select a.id, a.dojo_id, a.cinturon_desde, a.fecha_ingreso, c.orden, c.nombre
    from public.alumnos a
    left join public.cinturones c on c.id = a.cinturon_actual_id
    where a.id = p_alumno_id
  ),
  siguiente as (
    select c.*
    from public.cinturones c, alumno al
    where c.dojo_id = al.dojo_id
      and c.orden > coalesce(al.orden, -1)
    order by c.orden
    limit 1
  ),
  conteo as (
    select count(*)::int as asistencias
    from public.asistencias asis, alumno al
    where asis.alumno_id = al.id
      and asis.fecha >= coalesce(al.cinturon_desde, al.fecha_ingreso)
  ),
  solv as (
    select coalesce(bool_or(v.solvente), false) as solvente
    from public.vista_solvencia v, alumno al
    where v.alumno_id = al.id
  )
  select
    coalesce(al.nombre, 'Sin grado')                             as cinturon_actual,
    sig.nombre                                                   as siguiente_cinturon,
    sig.id                                                       as siguiente_id,
    con.asistencias,
    coalesce(req.asistencias_minimas, 0)                         as asistencias_minimas,
    (extract(year from age(current_date, coalesce(al.cinturon_desde, al.fecha_ingreso))) * 12
      + extract(month from age(current_date, coalesce(al.cinturon_desde, al.fecha_ingreso))))::int
                                                                 as meses_en_grado,
    coalesce(req.meses_minimos_en_grado_anterior, 0)             as meses_minimos,
    coalesce(req.requiere_solvencia, false)                      as requiere_solvencia,
    s.solvente,
    (
      con.asistencias >= coalesce(req.asistencias_minimas, 0)
      and (extract(year from age(current_date, coalesce(al.cinturon_desde, al.fecha_ingreso))) * 12
           + extract(month from age(current_date, coalesce(al.cinturon_desde, al.fecha_ingreso))))
          >= coalesce(req.meses_minimos_en_grado_anterior, 0)
      and (not coalesce(req.requiere_solvencia, false) or s.solvente)
    )                                                            as elegible
  from alumno al
  cross join conteo con
  cross join solv s
  left join siguiente sig on true
  left join public.requisitos_grado req on req.cinturon_id = sig.id;
$$;

revoke execute on function public.progreso_de_grado(uuid) from public, anon;
grant execute on function public.progreso_de_grado(uuid) to authenticated;
