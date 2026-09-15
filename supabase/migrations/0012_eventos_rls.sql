-- =============================================================================
-- Fase 6 - Politicas de eventos.
-- =============================================================================

revoke all on public.eventos, public.inscripciones from anon;
grant select on public.eventos to authenticated;
grant insert, update, delete on public.eventos to authenticated;
grant select, insert, update on public.inscripciones to authenticated;

alter table public.eventos       enable row level security;
alter table public.inscripciones enable row level security;

-- Todo el dojo ve la cartelera: es informacion que la familia necesita.
create policy eventos_select_dojo on public.eventos
  for select to authenticated
  using (dojo_id = app.dojo_actual());

create policy eventos_escritura_maestro on public.eventos
  for all to authenticated
  using (dojo_id = app.dojo_actual() and app.es_maestro())
  with check (dojo_id = app.dojo_actual() and app.es_maestro());

-- -----------------------------------------------------------------------------
-- inscripciones
-- -----------------------------------------------------------------------------

create policy inscripciones_select_staff on public.inscripciones
  for select to authenticated
  using (dojo_id = app.dojo_actual() and app.es_staff());

create policy inscripciones_select_familia on public.inscripciones
  for select to authenticated
  using (
    dojo_id = app.dojo_actual()
    and (alumno_id = app.alumno_propio() or app.es_representante_de(alumno_id))
  );

-- La familia inscribe a los suyos, siempre como pendiente.
create policy inscripciones_insert_familia on public.inscripciones
  for insert to authenticated
  with check (
    dojo_id = app.dojo_actual()
    and estado = 'pendiente'
    and (alumno_id = app.alumno_propio() or app.es_representante_de(alumno_id))
  );

create policy inscripciones_insert_staff on public.inscripciones
  for insert to authenticated
  with check (dojo_id = app.dojo_actual() and app.es_maestro());

create policy inscripciones_update_maestro on public.inscripciones
  for update to authenticated
  using (dojo_id = app.dojo_actual() and app.es_maestro())
  with check (dojo_id = app.dojo_actual() and app.es_maestro());

-- -----------------------------------------------------------------------------
-- Los comprobantes de evento van al mismo bucket que los de pago, con la misma
-- estructura de carpetas, asi que heredan sus politicas de storage.
-- -----------------------------------------------------------------------------
