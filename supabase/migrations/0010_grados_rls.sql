-- =============================================================================
-- Fase 5 - Politicas de grados.
-- =============================================================================

revoke all on public.cinturones, public.requisitos_grado, public.examenes, public.certificados
  from anon;

grant select on public.cinturones, public.requisitos_grado, public.examenes, public.certificados
  to authenticated;
grant insert, update, delete on public.cinturones, public.requisitos_grado to authenticated;
grant insert on public.examenes to authenticated;

alter table public.cinturones       enable row level security;
alter table public.requisitos_grado enable row level security;
alter table public.examenes         enable row level security;
alter table public.certificados     enable row level security;

-- El catalogo de cinturones y sus requisitos los ve todo el dojo: el alumno
-- necesita saber que le falta para el siguiente grado.
create policy cinturones_select_dojo on public.cinturones
  for select to authenticated
  using (dojo_id = app.dojo_actual());

create policy cinturones_escritura_maestro on public.cinturones
  for all to authenticated
  using (dojo_id = app.dojo_actual() and app.es_maestro())
  with check (dojo_id = app.dojo_actual() and app.es_maestro());

create policy requisitos_select_dojo on public.requisitos_grado
  for select to authenticated
  using (dojo_id = app.dojo_actual());

create policy requisitos_escritura_maestro on public.requisitos_grado
  for all to authenticated
  using (dojo_id = app.dojo_actual() and app.es_maestro())
  with check (dojo_id = app.dojo_actual() and app.es_maestro());

-- -----------------------------------------------------------------------------
-- examenes: el sensei tambien los registra (permiso `grados.examen.registrar`),
-- pero nadie los edita despues. Un resultado no se reescribe.
-- -----------------------------------------------------------------------------

create policy examenes_select_staff on public.examenes
  for select to authenticated
  using (dojo_id = app.dojo_actual() and app.es_staff());

create policy examenes_select_familia on public.examenes
  for select to authenticated
  using (
    dojo_id = app.dojo_actual()
    and (alumno_id = app.alumno_propio() or app.es_representante_de(alumno_id))
  );

create policy examenes_insert_staff on public.examenes
  for insert to authenticated
  with check (dojo_id = app.dojo_actual() and app.es_staff());

-- -----------------------------------------------------------------------------
-- certificados: se emiten solos al aprobar. Nadie los inserta a mano, por eso
-- no hay politica de INSERT ni grant de escritura.
-- -----------------------------------------------------------------------------

create policy certificados_select_staff on public.certificados
  for select to authenticated
  using (dojo_id = app.dojo_actual() and app.es_staff());

create policy certificados_select_familia on public.certificados
  for select to authenticated
  using (
    dojo_id = app.dojo_actual()
    and (alumno_id = app.alumno_propio() or app.es_representante_de(alumno_id))
  );
