-- =============================================================================
-- Fase 2 - Politicas RLS de alumnos, clases y horarios.
--
-- Reglas de negocio que codifican estas politicas:
--   * maestro: gestiona todo dentro de su dojo;
--   * sensei:  lee los alumnos del dojo y gestiona SUS clases, no las de otros;
--   * representante: ve unicamente a los alumnos que tiene asignados;
--   * alumno: ve unicamente su propia ficha.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Helpers. SECURITY DEFINER para no disparar RLS en cadena desde las politicas.
-- -----------------------------------------------------------------------------

create or replace function app.es_representante_de(p_alumno_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.representante_alumno ra
    where ra.alumno_id = p_alumno_id
      and ra.representante_id = auth.uid()
  );
$$;

-- Ficha del alumno que corresponde a la cuenta conectada (rol `alumno`).
create or replace function app.alumno_propio()
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select a.id from public.alumnos a where a.usuario_id = auth.uid();
$$;

-- El sensei solo manda en las clases que tiene asignadas.
create or replace function app.imparte_clase(p_clase_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.clases c
    where c.id = p_clase_id and c.sensei_id = auth.uid()
  );
$$;

revoke execute on function
  app.es_staff(), app.es_representante_de(uuid), app.alumno_propio(), app.imparte_clase(uuid)
  from public, anon;
grant execute on function
  app.es_staff(), app.es_representante_de(uuid), app.alumno_propio(), app.imparte_clase(uuid)
  to authenticated;

-- -----------------------------------------------------------------------------
-- Privilegios
-- -----------------------------------------------------------------------------

revoke all on
  public.alumnos, public.representante_alumno, public.clases,
  public.horarios, public.clase_alumno
  from anon;

grant select, insert, update, delete on
  public.alumnos, public.representante_alumno, public.clases,
  public.horarios, public.clase_alumno
  to authenticated;

alter table public.alumnos              enable row level security;
alter table public.representante_alumno enable row level security;
alter table public.clases               enable row level security;
alter table public.horarios             enable row level security;
alter table public.clase_alumno         enable row level security;

-- -----------------------------------------------------------------------------
-- alumnos
-- -----------------------------------------------------------------------------

create policy alumnos_select_staff on public.alumnos
  for select to authenticated
  using (dojo_id = app.dojo_actual() and app.es_staff());

create policy alumnos_select_representante on public.alumnos
  for select to authenticated
  using (dojo_id = app.dojo_actual() and app.es_representante_de(id));

create policy alumnos_select_propio on public.alumnos
  for select to authenticated
  using (usuario_id = auth.uid());

-- Solo el maestro da de alta y de baja alumnos (permiso `alumnos.gestionar`).
create policy alumnos_escritura_maestro on public.alumnos
  for all to authenticated
  using (dojo_id = app.dojo_actual() and app.es_maestro())
  with check (dojo_id = app.dojo_actual() and app.es_maestro());

-- -----------------------------------------------------------------------------
-- representante_alumno
-- -----------------------------------------------------------------------------

create policy rep_alumno_select_staff on public.representante_alumno
  for select to authenticated
  using (dojo_id = app.dojo_actual() and app.es_staff());

create policy rep_alumno_select_propio on public.representante_alumno
  for select to authenticated
  using (representante_id = auth.uid());

create policy rep_alumno_escritura_maestro on public.representante_alumno
  for all to authenticated
  using (dojo_id = app.dojo_actual() and app.es_maestro())
  with check (dojo_id = app.dojo_actual() and app.es_maestro());

-- -----------------------------------------------------------------------------
-- clases y horarios
--
-- Todo el dojo puede LEER el catalogo de clases y horarios: la familia necesita
-- saber cuando entrena su alumno.
-- -----------------------------------------------------------------------------

create policy clases_select_dojo on public.clases
  for select to authenticated
  using (dojo_id = app.dojo_actual());

create policy clases_escritura_maestro on public.clases
  for all to authenticated
  using (dojo_id = app.dojo_actual() and app.es_maestro())
  with check (dojo_id = app.dojo_actual() and app.es_maestro());

create policy horarios_select_dojo on public.horarios
  for select to authenticated
  using (dojo_id = app.dojo_actual());

create policy horarios_escritura_maestro on public.horarios
  for all to authenticated
  using (dojo_id = app.dojo_actual() and app.es_maestro())
  with check (dojo_id = app.dojo_actual() and app.es_maestro());

-- -----------------------------------------------------------------------------
-- clase_alumno
-- -----------------------------------------------------------------------------

create policy clase_alumno_select_staff on public.clase_alumno
  for select to authenticated
  using (dojo_id = app.dojo_actual() and app.es_staff());

create policy clase_alumno_select_familia on public.clase_alumno
  for select to authenticated
  using (
    dojo_id = app.dojo_actual()
    and (alumno_id = app.alumno_propio() or app.es_representante_de(alumno_id))
  );

create policy clase_alumno_escritura_maestro on public.clase_alumno
  for all to authenticated
  using (dojo_id = app.dojo_actual() and app.es_maestro())
  with check (dojo_id = app.dojo_actual() and app.es_maestro());

-- El sensei puede mover alumnos dentro de las clases que el imparte, sin poder
-- tocar las de otros sensei.
create policy clase_alumno_escritura_sensei on public.clase_alumno
  for all to authenticated
  using (dojo_id = app.dojo_actual() and app.imparte_clase(clase_id))
  with check (dojo_id = app.dojo_actual() and app.imparte_clase(clase_id));
