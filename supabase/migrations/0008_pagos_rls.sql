-- =============================================================================
-- Fase 4 - Politicas de pagos y almacenamiento de comprobantes.
-- =============================================================================

revoke all on public.planes_pago, public.pagos from anon;
grant select on public.planes_pago to authenticated;
grant insert, update, delete on public.planes_pago to authenticated;
grant select, insert, update on public.pagos to authenticated;

alter table public.planes_pago enable row level security;
alter table public.pagos       enable row level security;

-- -----------------------------------------------------------------------------
-- planes_pago: todo el dojo los lee (la familia necesita saber cuanto paga).
-- -----------------------------------------------------------------------------

create policy planes_select_dojo on public.planes_pago
  for select to authenticated
  using (dojo_id = app.dojo_actual());

create policy planes_escritura_maestro on public.planes_pago
  for all to authenticated
  using (dojo_id = app.dojo_actual() and app.es_maestro())
  with check (dojo_id = app.dojo_actual() and app.es_maestro());

-- -----------------------------------------------------------------------------
-- pagos
-- -----------------------------------------------------------------------------

create policy pagos_select_staff on public.pagos
  for select to authenticated
  using (dojo_id = app.dojo_actual() and app.es_staff());

create policy pagos_select_familia on public.pagos
  for select to authenticated
  using (
    dojo_id = app.dojo_actual()
    and (alumno_id = app.alumno_propio() or app.es_representante_de(alumno_id))
  );

-- La familia sube el comprobante: siempre entra como 'pendiente'. No puede
-- crear un pago ya aprobado.
create policy pagos_insert_familia on public.pagos
  for insert to authenticated
  with check (
    dojo_id = app.dojo_actual()
    and estado = 'pendiente'
    and (alumno_id = app.alumno_propio() or app.es_representante_de(alumno_id))
  );

create policy pagos_insert_staff on public.pagos
  for insert to authenticated
  with check (dojo_id = app.dojo_actual() and app.es_maestro());

-- Verificar es competencia del maestro (permiso `pagos.verificar`).
create policy pagos_update_maestro on public.pagos
  for update to authenticated
  using (dojo_id = app.dojo_actual() and app.es_maestro())
  with check (dojo_id = app.dojo_actual() and app.es_maestro());

-- La familia puede corregir un pago propio mientras siga pendiente; en cuanto
-- esta verificado, queda inmutable para ella.
create policy pagos_update_familia on public.pagos
  for update to authenticated
  using (
    dojo_id = app.dojo_actual()
    and estado = 'pendiente'
    and (alumno_id = app.alumno_propio() or app.es_representante_de(alumno_id))
  )
  with check (estado = 'pendiente');

-- -----------------------------------------------------------------------------
-- Storage: comprobantes
--
-- Bucket PRIVADO. Las rutas son <dojo_id>/<alumno_id>/<archivo>, y la primera
-- carpeta es lo que se compara con el dojo del usuario.
-- -----------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'comprobantes', 'comprobantes', false, 10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do nothing;

create policy comprobantes_subir_familia on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'comprobantes'
    and (storage.foldername(name))[1] = app.dojo_actual()::text
  );

create policy comprobantes_leer_propios on storage.objects
  for select to authenticated
  using (
    bucket_id = 'comprobantes'
    and (storage.foldername(name))[1] = app.dojo_actual()::text
    and (
      app.es_staff()
      or (storage.foldername(name))[2] = app.alumno_propio()::text
      or app.es_representante_de(nullif((storage.foldername(name))[2], '')::uuid)
    )
  );

create policy comprobantes_borrar_maestro on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'comprobantes'
    and (storage.foldername(name))[1] = app.dojo_actual()::text
    and app.es_maestro()
  );
