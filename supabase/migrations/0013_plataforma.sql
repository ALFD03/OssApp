-- =============================================================================
-- Fase 7 - Suscripciones de los dojos a la plataforma y soporte.
--
-- Es el unico ambito transversal del superadmin: licencias, cobro de la
-- suscripcion y soporte. Sigue SIN ver datos operativos (alumnos, pagos,
-- asistencia) de ningun dojo.
-- =============================================================================

create type public.estado_ticket as enum ('abierto', 'en_proceso', 'cerrado');

-- -----------------------------------------------------------------------------
-- suscripciones: el pago DEL dojo A la plataforma.
-- Misma forma de verificacion manual que `pagos`.
-- -----------------------------------------------------------------------------

create table public.suscripciones (
  id              uuid primary key default gen_random_uuid(),
  dojo_id         uuid not null references public.dojos (id) on delete cascade,
  periodo         date not null,
  monto           numeric(12, 2) not null check (monto >= 0),
  moneda          text not null default 'USD',
  referencia      text,

  comprobante_url text,
  estado          public.estado_verificacion not null default 'pendiente',
  motivo_rechazo  text,
  verificado_por  uuid references public.usuarios (id) on delete set null,
  verificado_el   timestamptz,

  subido_por      uuid references public.usuarios (id) on delete set null,
  creado_el       timestamptz not null default now(),
  actualizado_el  timestamptz not null default now(),

  constraint suscripciones_periodo_dia_1 check (extract(day from periodo) = 1),
  constraint suscripciones_rechazo_con_motivo check (
    estado <> 'rechazado' or (motivo_rechazo is not null and length(btrim(motivo_rechazo)) > 0)
  ),
  constraint suscripciones_verificado_coherente check (
    (estado = 'pendiente' and verificado_el is null)
    or (estado <> 'pendiente' and verificado_el is not null)
  )
);

create unique index suscripciones_periodo_vivo_idx
  on public.suscripciones (dojo_id, periodo)
  where estado <> 'rechazado';

create index suscripciones_estado_idx on public.suscripciones (estado, periodo desc);

create trigger suscripciones_actualizado_el
  before update on public.suscripciones
  for each row execute function app.tocar_actualizado_el();

create trigger suscripciones_sellar_verificacion
  before update on public.suscripciones
  for each row execute function app.sellar_verificacion();

-- Al aprobar la suscripcion, la licencia del dojo se renueva sola. Dejarlo como
-- dos pasos manuales garantiza que tarde o temprano se olvide el segundo.
create or replace function app.aplicar_suscripcion_aprobada()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.estado = 'aprobado' and old.estado is distinct from 'aprobado' then
    update public.dojos
    set estado_licencia = 'activa',
        licencia_vence_el = greatest(
          coalesce(licencia_vence_el, current_date),
          (new.periodo + interval '1 month')::date - 1
        )
    where id = new.dojo_id;
  end if;
  return new;
end;
$$;

create trigger suscripciones_aplicar_aprobada
  after update on public.suscripciones
  for each row execute function app.aplicar_suscripcion_aprobada();

-- -----------------------------------------------------------------------------
-- tickets_soporte
--
-- Unica tabla con dojo_id que el superadmin lee de forma transversal.
-- -----------------------------------------------------------------------------

create table public.tickets_soporte (
  id             uuid primary key default gen_random_uuid(),
  dojo_id        uuid not null references public.dojos (id) on delete cascade,
  abierto_por    uuid references public.usuarios (id) on delete set null,
  asunto         text not null check (length(btrim(asunto)) between 3 and 160),
  descripcion    text not null check (length(btrim(descripcion)) >= 3),
  estado         public.estado_ticket not null default 'abierto',
  respuesta      text,
  cerrado_el     timestamptz,
  creado_el      timestamptz not null default now(),
  actualizado_el timestamptz not null default now()
);

create index tickets_estado_idx on public.tickets_soporte (estado, creado_el desc);
create index tickets_dojo_idx on public.tickets_soporte (dojo_id);

create trigger tickets_actualizado_el
  before update on public.tickets_soporte
  for each row execute function app.tocar_actualizado_el();

create or replace function app.sellar_cierre_ticket()
returns trigger
language plpgsql
as $$
begin
  if new.estado = 'cerrado' and old.estado is distinct from 'cerrado' then
    new.cerrado_el := now();
  elsif new.estado <> 'cerrado' then
    new.cerrado_el := null;
  end if;
  return new;
end;
$$;

create trigger tickets_sellar_cierre
  before update on public.tickets_soporte
  for each row execute function app.sellar_cierre_ticket();

-- -----------------------------------------------------------------------------
-- Metricas globales
--
-- Agregados por dojo, nunca filas individuales: el superadmin necesita saber
-- cuantos alumnos tiene un dojo, no quienes son.
-- -----------------------------------------------------------------------------

create or replace function public.metricas_plataforma()
returns table (
  dojo_id           uuid,
  dojo              text,
  estado_licencia   public.estado_licencia,
  licencia_vence_el date,
  alumnos_activos   int,
  clases_activas    int,
  usuarios          int,
  asistencias_30d   int,
  ingresos_mes      numeric,
  suscripcion_al_dia boolean
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    d.id,
    d.nombre,
    d.estado_licencia,
    d.licencia_vence_el,
    (select count(*) from public.alumnos a where a.dojo_id = d.id and a.activo)::int,
    (select count(*) from public.clases c where c.dojo_id = d.id and c.activa)::int,
    (select count(*) from public.usuarios u where u.dojo_id = d.id and u.activo)::int,
    (select count(*) from public.asistencias asi
      where asi.dojo_id = d.id and asi.fecha >= current_date - 30)::int,
    (select coalesce(sum(p.monto), 0) from public.pagos p
      where p.dojo_id = d.id and p.estado = 'aprobado'
        and p.periodo = date_trunc('month', current_date)::date),
    exists (
      select 1 from public.suscripciones s
      where s.dojo_id = d.id and s.estado = 'aprobado'
        and s.periodo = date_trunc('month', current_date)::date
    )
  from public.dojos d
  -- SECURITY DEFINER, asi que el filtro de autorizacion va explicito aqui:
  -- sin esto cualquier usuario veria las metricas de todos los dojos.
  where app.es_superadmin()
  order by d.nombre;
$$;

revoke execute on function public.metricas_plataforma() from public, anon;
grant execute on function public.metricas_plataforma() to authenticated;
