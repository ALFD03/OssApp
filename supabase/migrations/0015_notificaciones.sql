-- =============================================================================
-- Fase 8 - Notificaciones.
--
-- Las notificaciones se CREAN en el servidor, desde los mismos triggers que ya
-- resuelven cada flujo. Si dependieran del cliente, cerrar la app antes de
-- tiempo dejaria al usuario sin enterarse del resultado.
-- =============================================================================

create type public.tipo_notificacion as enum (
  'pago_aprobado',
  'pago_rechazado',
  'examen_registrado',
  'evento_nuevo',
  'inscripcion_resuelta',
  'licencia',
  'soporte'
);

create table public.notificaciones (
  id         uuid primary key default gen_random_uuid(),
  dojo_id    uuid references public.dojos (id) on delete cascade,
  usuario_id uuid not null references public.usuarios (id) on delete cascade,
  tipo       public.tipo_notificacion not null,
  titulo     text not null,
  cuerpo     text not null,
  datos      jsonb not null default '{}'::jsonb,
  leida      boolean not null default false,
  creado_el  timestamptz not null default now()
);

create index notificaciones_usuario_idx on public.notificaciones (usuario_id, leida, creado_el desc);

-- -----------------------------------------------------------------------------
-- dispositivos: un usuario puede tener varios (telefono, tablet).
-- -----------------------------------------------------------------------------

create table public.dispositivos (
  id          uuid primary key default gen_random_uuid(),
  usuario_id  uuid not null references public.usuarios (id) on delete cascade,
  push_token  text not null unique,
  plataforma  text not null check (plataforma in ('ios', 'android', 'web')),
  creado_el   timestamptz not null default now(),
  usado_el    timestamptz not null default now()
);

create index dispositivos_usuario_idx on public.dispositivos (usuario_id);

-- -----------------------------------------------------------------------------
-- Emisor interno
-- -----------------------------------------------------------------------------

create or replace function app.notificar(
  p_usuario_id uuid,
  p_dojo_id    uuid,
  p_tipo       public.tipo_notificacion,
  p_titulo     text,
  p_cuerpo     text,
  p_datos      jsonb default '{}'::jsonb
)
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  insert into public.notificaciones (usuario_id, dojo_id, tipo, titulo, cuerpo, datos)
  values (p_usuario_id, p_dojo_id, p_tipo, p_titulo, p_cuerpo, p_datos);
$$;

/* Destinatarios de un alumno: su propia cuenta si la tiene, mas todos sus
   representantes. Se usa en casi todos los avisos de las familias. */
create or replace function app.destinatarios_de_alumno(p_alumno_id uuid)
returns table (usuario_id uuid)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select a.usuario_id from public.alumnos a
  where a.id = p_alumno_id and a.usuario_id is not null
  union
  select ra.representante_id from public.representante_alumno ra
  where ra.alumno_id = p_alumno_id;
$$;

-- -----------------------------------------------------------------------------
-- Disparadores sobre los flujos ya existentes
-- -----------------------------------------------------------------------------

create or replace function app.notificar_pago_verificado()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_destino uuid;
  v_alumno  text;
begin
  if new.estado = old.estado or new.estado = 'pendiente' then
    return new;
  end if;

  select nombre into v_alumno from public.alumnos where id = new.alumno_id;

  for v_destino in select usuario_id from app.destinatarios_de_alumno(new.alumno_id) loop
    if new.estado = 'aprobado' then
      perform app.notificar(
        v_destino, new.dojo_id, 'pago_aprobado',
        'Pago aprobado',
        format('El pago de %s quedo verificado.', v_alumno),
        jsonb_build_object('pago_id', new.id)
      );
    else
      perform app.notificar(
        v_destino, new.dojo_id, 'pago_rechazado',
        'Pago rechazado',
        format('El pago de %s fue rechazado: %s', v_alumno, new.motivo_rechazo),
        jsonb_build_object('pago_id', new.id)
      );
    end if;
  end loop;

  return new;
end;
$$;

create trigger pagos_notificar
  after update on public.pagos
  for each row execute function app.notificar_pago_verificado();

create or replace function app.notificar_examen()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_destino  uuid;
  v_cinturon text;
begin
  select nombre into v_cinturon from public.cinturones where id = new.cinturon_destino_id;

  for v_destino in select usuario_id from app.destinatarios_de_alumno(new.alumno_id) loop
    perform app.notificar(
      v_destino, new.dojo_id, 'examen_registrado',
      case when new.resultado = 'aprobado' then 'Examen aprobado' else 'Resultado de examen' end,
      case
        when new.resultado = 'aprobado'
          then format('Felicidades: nuevo cinturon %s.', v_cinturon)
        else format('El examen de cinturon %s no fue aprobado esta vez.', v_cinturon)
      end,
      jsonb_build_object('examen_id', new.id)
    );
  end loop;

  return new;
end;
$$;

create trigger examenes_notificar
  after insert on public.examenes
  for each row execute function app.notificar_examen();

/* Evento nuevo: se avisa a todas las familias del dojo. */
create or replace function app.notificar_evento_nuevo()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_destino uuid;
begin
  if not new.activo then
    return new;
  end if;

  for v_destino in
    select u.id from public.usuarios u
    where u.dojo_id = new.dojo_id and u.activo and u.rol in ('representante', 'alumno')
  loop
    perform app.notificar(
      v_destino, new.dojo_id, 'evento_nuevo',
      'Nuevo evento en tu dojo',
      format('%s - %s', new.nombre, new.fecha),
      jsonb_build_object('evento_id', new.id)
    );
  end loop;

  return new;
end;
$$;

create trigger eventos_notificar
  after insert on public.eventos
  for each row execute function app.notificar_evento_nuevo();

create or replace function app.notificar_inscripcion_resuelta()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_destino uuid;
  v_evento  text;
begin
  if new.estado = old.estado or new.estado = 'pendiente' then
    return new;
  end if;

  select nombre into v_evento from public.eventos where id = new.evento_id;

  for v_destino in select usuario_id from app.destinatarios_de_alumno(new.alumno_id) loop
    perform app.notificar(
      v_destino, new.dojo_id, 'inscripcion_resuelta',
      case when new.estado = 'aprobado' then 'Inscripcion confirmada' else 'Inscripcion rechazada' end,
      case
        when new.estado = 'aprobado' then format('Plaza confirmada en %s.', v_evento)
        else format('Inscripcion a %s rechazada: %s', v_evento, new.motivo_rechazo)
      end,
      jsonb_build_object('inscripcion_id', new.id)
    );
  end loop;

  return new;
end;
$$;

create trigger inscripciones_notificar
  after update on public.inscripciones
  for each row execute function app.notificar_inscripcion_resuelta();

-- -----------------------------------------------------------------------------
-- Politicas
-- -----------------------------------------------------------------------------

revoke all on public.notificaciones, public.dispositivos from anon;
grant select, update on public.notificaciones to authenticated;
grant select, insert, update, delete on public.dispositivos to authenticated;

alter table public.notificaciones enable row level security;
alter table public.dispositivos   enable row level security;

-- Cada quien ve solo lo suyo. No hay politica de INSERT: las crea el servidor.
create policy notificaciones_propias on public.notificaciones
  for select to authenticated
  using (usuario_id = auth.uid());

-- Lo unico que puede cambiar el usuario es marcarla como leida.
create policy notificaciones_marcar_leida on public.notificaciones
  for update to authenticated
  using (usuario_id = auth.uid())
  with check (usuario_id = auth.uid());

create policy dispositivos_propios on public.dispositivos
  for all to authenticated
  using (usuario_id = auth.uid())
  with check (usuario_id = auth.uid());
