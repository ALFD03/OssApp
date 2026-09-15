-- =============================================================================
-- Fase 7 - Politicas de plataforma.
-- =============================================================================

revoke all on public.suscripciones, public.tickets_soporte from anon;
grant select, insert, update on public.suscripciones to authenticated;
grant select, insert, update on public.tickets_soporte to authenticated;

alter table public.suscripciones   enable row level security;
alter table public.tickets_soporte enable row level security;

-- -----------------------------------------------------------------------------
-- suscripciones
-- -----------------------------------------------------------------------------

create policy suscripciones_select_superadmin on public.suscripciones
  for select to authenticated
  using (app.es_superadmin());

-- El maestro ve y sube las de SU dojo: es quien paga.
create policy suscripciones_select_maestro on public.suscripciones
  for select to authenticated
  using (dojo_id = app.dojo_actual() and app.es_maestro());

create policy suscripciones_insert_maestro on public.suscripciones
  for insert to authenticated
  with check (dojo_id = app.dojo_actual() and app.es_maestro() and estado = 'pendiente');

-- Verificar el pago de la suscripcion es competencia exclusiva de la plataforma.
create policy suscripciones_update_superadmin on public.suscripciones
  for update to authenticated
  using (app.es_superadmin())
  with check (app.es_superadmin());

-- -----------------------------------------------------------------------------
-- tickets_soporte
-- -----------------------------------------------------------------------------

create policy tickets_select_superadmin on public.tickets_soporte
  for select to authenticated
  using (app.es_superadmin());

create policy tickets_select_maestro on public.tickets_soporte
  for select to authenticated
  using (dojo_id = app.dojo_actual() and app.es_maestro());

create policy tickets_insert_maestro on public.tickets_soporte
  for insert to authenticated
  with check (dojo_id = app.dojo_actual() and app.es_maestro() and estado = 'abierto');

-- Solo la plataforma responde y cierra.
create policy tickets_update_superadmin on public.tickets_soporte
  for update to authenticated
  using (app.es_superadmin())
  with check (app.es_superadmin());

-- -----------------------------------------------------------------------------
-- El superadmin necesita poder suspender y reactivar dojos. La politica
-- dojos_superadmin_todo de la Fase 1 ya se lo permite.
-- -----------------------------------------------------------------------------
