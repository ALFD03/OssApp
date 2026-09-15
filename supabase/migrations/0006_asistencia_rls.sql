-- =============================================================================
-- Fase 3 - Politicas de asistencia.
-- =============================================================================

revoke all on public.codigos_qr, public.asistencias from anon;
grant select on public.codigos_qr to authenticated;
grant insert, update, delete on public.codigos_qr to authenticated;
grant select, insert, delete on public.asistencias to authenticated;

alter table public.codigos_qr  enable row level security;
alter table public.asistencias enable row level security;

-- -----------------------------------------------------------------------------
-- codigos_qr
--
-- Solo el staff lee los codigos: la familia no necesita el token, lo escanea.
-- Que el token no circule por la app Familias reduce la superficie de copia.
-- -----------------------------------------------------------------------------

create policy codigos_qr_select_staff on public.codigos_qr
  for select to authenticated
  using (dojo_id = app.dojo_actual() and app.es_staff());

create policy codigos_qr_escritura_maestro on public.codigos_qr
  for all to authenticated
  using (dojo_id = app.dojo_actual() and app.es_maestro())
  with check (dojo_id = app.dojo_actual() and app.es_maestro());

-- -----------------------------------------------------------------------------
-- asistencias
-- -----------------------------------------------------------------------------

create policy asistencias_select_staff on public.asistencias
  for select to authenticated
  using (dojo_id = app.dojo_actual() and app.es_staff());

create policy asistencias_select_familia on public.asistencias
  for select to authenticated
  using (
    dojo_id = app.dojo_actual()
    and (alumno_id = app.alumno_propio() or app.es_representante_de(alumno_id))
  );

-- El marcado MANUAL es el respaldo del sensei y del maestro. La familia no
-- inserta directamente: pasa por registrar_asistencia_qr(), que valida horario.
create policy asistencias_insert_maestro on public.asistencias
  for insert to authenticated
  with check (dojo_id = app.dojo_actual() and app.es_maestro() and origen = 'manual');

create policy asistencias_insert_sensei on public.asistencias
  for insert to authenticated
  with check (
    dojo_id = app.dojo_actual()
    and app.imparte_clase(clase_id)
    and origen = 'manual'
  );

-- Corregir un error de marcado: se borra la fila, no se edita.
create policy asistencias_delete_maestro on public.asistencias
  for delete to authenticated
  using (dojo_id = app.dojo_actual() and app.es_maestro());

create policy asistencias_delete_sensei on public.asistencias
  for delete to authenticated
  using (dojo_id = app.dojo_actual() and app.imparte_clase(clase_id));

-- -----------------------------------------------------------------------------
-- Un QR por dojo desde el primer dia: sin el, la Fase 3 no arranca.
-- -----------------------------------------------------------------------------

insert into public.codigos_qr (dojo_id, etiqueta)
select id, 'Entrada principal' from public.dojos
on conflict do nothing;
