-- =============================================================================
-- Fase 1 - Aislamiento multi-tenant por Row Level Security.
--
-- Esta migracion ES la frontera de seguridad del sistema. El filtrado en cliente
-- nunca aisla nada: si una fila no debe verse, la politica tiene que impedirlo.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Helpers de RLS
--
-- Son SECURITY DEFINER a proposito: leen public.usuarios, que es la misma tabla
-- sobre la que se evaluan las politicas. Al ejecutarse como propietario (rol con
-- BYPASSRLS) no vuelven a disparar RLS y no hay recursion infinita.
-- STABLE permite ademas que Postgres cachee el resultado dentro de la consulta.
-- -----------------------------------------------------------------------------

create or replace function app.rol_actual()
returns public.rol_usuario
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select u.rol from public.usuarios u where u.id = auth.uid() and u.activo;
$$;

create or replace function app.dojo_actual()
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select u.dojo_id from public.usuarios u where u.id = auth.uid() and u.activo;
$$;

create or replace function app.es_superadmin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(app.rol_actual() = 'superadmin', false);
$$;

create or replace function app.es_maestro()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(app.rol_actual() = 'maestro', false);
$$;

comment on function app.dojo_actual() is 'Dojo del usuario autenticado; NULL para superadmin o cuenta inactiva.';

revoke execute on function app.rol_actual(), app.dojo_actual(), app.es_superadmin(), app.es_maestro()
  from public, anon;
grant execute on function app.rol_actual(), app.dojo_actual(), app.es_superadmin(), app.es_maestro()
  to authenticated;

-- -----------------------------------------------------------------------------
-- Privilegios de tabla: ninguna cuenta anonima toca estas tablas.
-- -----------------------------------------------------------------------------

revoke all on public.dojos, public.usuarios from anon;
grant select on public.dojos to authenticated;
grant select, insert, update on public.usuarios to authenticated;

alter table public.dojos    enable row level security;
alter table public.usuarios enable row level security;

-- -----------------------------------------------------------------------------
-- dojos
-- -----------------------------------------------------------------------------

create policy dojos_select on public.dojos
  for select to authenticated
  using (app.es_superadmin() or id = app.dojo_actual());

-- El alta, suspension y borrado de dojos es competencia exclusiva de la
-- plataforma (Fase 7). El maestro editara datos de su dojo en una fase posterior.
create policy dojos_superadmin_todo on public.dojos
  for all to authenticated
  using (app.es_superadmin())
  with check (app.es_superadmin());

-- -----------------------------------------------------------------------------
-- usuarios
-- -----------------------------------------------------------------------------

-- La propia fila siempre es visible: sin ella la app no puede resolver el rol.
create policy usuarios_select_propio on public.usuarios
  for select to authenticated
  using (id = auth.uid());

create policy usuarios_select_mismo_dojo on public.usuarios
  for select to authenticated
  using (dojo_id is not null and dojo_id = app.dojo_actual());

create policy usuarios_select_superadmin on public.usuarios
  for select to authenticated
  using (app.es_superadmin());

-- Cada quien edita su propio perfil. El trigger usuarios_proteger_campos impide
-- que por esta via se cambie el rol o el dojo.
create policy usuarios_update_propio on public.usuarios
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- El maestro da de alta personal y familias dentro de su dojo, nunca otro maestro
-- ni un superadmin, y nunca en un dojo ajeno.
create policy usuarios_insert_maestro on public.usuarios
  for insert to authenticated
  with check (
    app.es_maestro()
    and dojo_id = app.dojo_actual()
    and rol in ('sensei', 'representante', 'alumno')
  );

create policy usuarios_update_maestro on public.usuarios
  for update to authenticated
  using (
    app.es_maestro()
    and dojo_id = app.dojo_actual()
    and rol in ('sensei', 'representante', 'alumno')
  )
  with check (
    dojo_id = app.dojo_actual()
    and rol in ('sensei', 'representante', 'alumno')
  );

create policy usuarios_superadmin_todo on public.usuarios
  for all to authenticated
  using (app.es_superadmin())
  with check (app.es_superadmin());

-- -----------------------------------------------------------------------------
-- Proteccion de campos criticos
--
-- Las politicas WITH CHECK no comparan contra el valor anterior de la fila, asi
-- que la escalada de privilegios (cambiarse el rol a maestro, mover una fila a
-- otro dojo) se bloquea aqui, donde OLD y NEW estan disponibles.
-- -----------------------------------------------------------------------------

create or replace function app.proteger_campos_criticos()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.rol is distinct from old.rol then
    if not (app.es_superadmin() or (app.es_maestro()
        and old.rol in ('sensei', 'representante', 'alumno')
        and new.rol in ('sensei', 'representante', 'alumno')
        and old.dojo_id = app.dojo_actual())) then
      raise exception 'No tienes permiso para cambiar el rol de este usuario' using errcode = '42501';
    end if;
  end if;

  if new.dojo_id is distinct from old.dojo_id then
    if not app.es_superadmin() then
      raise exception 'No tienes permiso para mover un usuario de dojo' using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

create trigger usuarios_proteger_campos
  before update on public.usuarios
  for each row execute function app.proteger_campos_criticos();
