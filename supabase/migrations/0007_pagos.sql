-- =============================================================================
-- Fase 4 - Pagos manuales con verificacion humana y estado de solvencia.
--
-- No hay pasarela de pago (spec seccion 6): la familia sube un comprobante y un
-- maestro lo aprueba o lo rechaza. La MISMA forma se reutiliza en la Fase 7
-- para los pagos de suscripcion del dojo a la plataforma.
-- =============================================================================

create type public.estado_verificacion as enum ('pendiente', 'aprobado', 'rechazado');
create type public.periodicidad_plan as enum ('mensual', 'trimestral', 'anual');

-- -----------------------------------------------------------------------------
-- planes_pago
-- -----------------------------------------------------------------------------

create table public.planes_pago (
  id             uuid primary key default gen_random_uuid(),
  dojo_id        uuid not null references public.dojos (id) on delete cascade,
  nombre         text not null check (length(btrim(nombre)) between 2 and 120),
  monto          numeric(12, 2) not null check (monto >= 0),
  moneda         text not null default 'USD' check (length(moneda) = 3),
  periodicidad   public.periodicidad_plan not null default 'mensual',
  activo         boolean not null default true,
  creado_el      timestamptz not null default now(),
  actualizado_el timestamptz not null default now()
);

create index planes_pago_dojo_idx on public.planes_pago (dojo_id);

create trigger planes_pago_actualizado_el
  before update on public.planes_pago
  for each row execute function app.tocar_actualizado_el();

-- -----------------------------------------------------------------------------
-- pagos
--
-- `periodo` es siempre el primer dia del periodo cubierto, para que dos pagos
-- del mismo mes colisionen de forma predecible.
-- -----------------------------------------------------------------------------

create table public.pagos (
  id              uuid primary key default gen_random_uuid(),
  dojo_id         uuid not null references public.dojos (id) on delete cascade,
  alumno_id       uuid not null references public.alumnos (id) on delete cascade,
  plan_id         uuid references public.planes_pago (id) on delete set null,
  periodo         date not null,
  monto           numeric(12, 2) not null check (monto >= 0),
  moneda          text not null default 'USD',
  referencia      text,

  -- Flujo de verificacion manual (identico en suscripciones, Fase 7)
  comprobante_url text,
  estado          public.estado_verificacion not null default 'pendiente',
  motivo_rechazo  text,
  verificado_por  uuid references public.usuarios (id) on delete set null,
  verificado_el   timestamptz,

  subido_por      uuid references public.usuarios (id) on delete set null,
  creado_el       timestamptz not null default now(),
  actualizado_el  timestamptz not null default now(),

  constraint pagos_periodo_dia_1 check (extract(day from periodo) = 1),
  constraint pagos_rechazo_con_motivo check (
    estado <> 'rechazado' or (motivo_rechazo is not null and length(btrim(motivo_rechazo)) > 0)
  ),
  constraint pagos_verificado_coherente check (
    (estado = 'pendiente' and verificado_el is null)
    or (estado <> 'pendiente' and verificado_el is not null)
  )
);

comment on column public.pagos.periodo is 'Primer dia del periodo cubierto (2026-03-01 = marzo de 2026).';

-- Un alumno no puede tener dos pagos vivos del mismo periodo. Los rechazados no
-- cuentan: tras un rechazo hay que poder volver a subir el comprobante.
create unique index pagos_periodo_vivo_idx
  on public.pagos (alumno_id, periodo)
  where estado <> 'rechazado';

create index pagos_dojo_estado_idx on public.pagos (dojo_id, estado);
create index pagos_alumno_idx on public.pagos (alumno_id, periodo desc);

create trigger pagos_actualizado_el
  before update on public.pagos
  for each row execute function app.tocar_actualizado_el();

create trigger pagos_coherencia before insert or update on public.pagos
  for each row execute function app.validar_coherencia_dojo();

-- -----------------------------------------------------------------------------
-- Sello de verificacion
--
-- Quien y cuando verifico no lo decide el cliente: lo pone el servidor a partir
-- de la sesion. Asi no se puede falsear el autor de una aprobacion.
-- -----------------------------------------------------------------------------

create or replace function app.sellar_verificacion()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.estado is distinct from old.estado then
    if new.estado = 'pendiente' then
      new.verificado_por := null;
      new.verificado_el := null;
      new.motivo_rechazo := null;
    else
      new.verificado_por := auth.uid();
      new.verificado_el := now();
    end if;
  end if;
  return new;
end;
$$;

create trigger pagos_sellar_verificacion
  before update on public.pagos
  for each row execute function app.sellar_verificacion();

-- -----------------------------------------------------------------------------
-- Solvencia
--
-- No es una columna editable: se DERIVA del ultimo pago aprobado y de la
-- periodicidad del plan. Una columna a mano se desincroniza en cuanto alguien
-- olvida actualizarla.
-- -----------------------------------------------------------------------------

create or replace view public.vista_solvencia
with (security_invoker = true)
as
select
  a.id                          as alumno_id,
  a.dojo_id,
  a.nombre,
  a.apellido,
  ultimo.periodo                as ultimo_periodo_pagado,
  ultimo.cubierto_hasta,
  coalesce(ultimo.cubierto_hasta >= current_date, false) as solvente,
  -- Solo cuenta atraso cuando lo hay: en negativo serian dias restantes, que
  -- es otra cosa y se leia como si el alumno debiera.
  case
    when ultimo.cubierto_hasta is null then null
    else greatest(current_date - ultimo.cubierto_hasta, 0)
  end                           as dias_de_atraso
from public.alumnos a
left join lateral (
  select
    p.periodo,
    (p.periodo + case coalesce(pl.periodicidad, 'mensual')
                   when 'mensual'    then interval '1 month'
                   when 'trimestral' then interval '3 months'
                   when 'anual'      then interval '1 year'
                 end)::date - 1 as cubierto_hasta
  from public.pagos p
  left join public.planes_pago pl on pl.id = p.plan_id
  where p.alumno_id = a.id and p.estado = 'aprobado'
  order by p.periodo desc
  limit 1
) ultimo on true
where a.activo;

comment on view public.vista_solvencia is 'Solvencia derivada del ultimo pago aprobado. security_invoker: hereda las politicas RLS de alumnos y pagos.';
