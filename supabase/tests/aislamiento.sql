-- =============================================================================
-- Prueba de aislamiento multi-tenant (Fase 1).
--
--   npm run db:test --db_url="postgresql://postgres:postgres@127.0.0.1:54322/postgres"
--
-- Suplanta a cada usuario del seed fijando request.jwt.claims y el rol
-- `authenticated`, igual que hace PostgREST, y verifica las politicas RLS.
-- Falla ruidosamente (RAISE EXCEPTION) en la primera asercion incumplida.
-- =============================================================================

\set ON_ERROR_STOP on

create or replace function pg_temp.suplantar(p_email text)
returns void
language plpgsql
as $$
declare
  v_id uuid;
begin
  -- Vuelve a admin antes de leer auth.users: el rol suplantado anterior no tiene
  -- privilegios sobre ese esquema.
  perform set_config('role', 'postgres', true);
  select id into strict v_id from auth.users where email = p_email;
  perform set_config('role', 'authenticated', true);
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', v_id::text, 'role', 'authenticated')::text,
    true
  );
end;
$$;

create or replace function pg_temp.volver_a_admin() returns void
language plpgsql as $$
begin
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claims', '', true);
end;
$$;

create or replace function pg_temp.afirmar(p_condicion boolean, p_mensaje text)
returns void
language plpgsql
as $$
begin
  if p_condicion is not true then
    raise exception 'FALLO: %', p_mensaje using errcode = 'triggered_action_exception';
  end if;
  raise notice '  ok  %', p_mensaje;
end;
$$;

begin;

do $$
declare
  v_sakura uuid;
  v_tigre  uuid;
  v_n      int;
  v_id     uuid;
  v_clase_tigre uuid;
  v_token_sakura text;
  v_token_tigre  text;
  v_clase_sakura uuid;
  v_alumno_sakura uuid;
  v_otro_alumno   uuid;
  v_asistencia public.asistencias;
  v_pago_id    uuid;
  v_pago_tigre uuid;
  v_alumno_tigre uuid;
  v_cint_verde uuid;
  v_cint_tigre uuid;
  v_progreso record;
  v_evento_sakura uuid;
  v_evento_tigre  uuid;
  v_susc_tigre    uuid;
  v_ticket        uuid;
begin
  select id into v_sakura from public.dojos where slug = 'dojo-sakura';
  select id into v_tigre  from public.dojos where slug = 'dojo-tigre';
  -- Se captura ahora, como admin: mas adelante el maestro de Sakura no puede
  -- ni leer esta fila, y hace falta el id para probar el trigger de coherencia.
  select id into v_clase_tigre from public.clases where dojo_id = v_tigre limit 1;

  -- ---------------------------------------------------------------------
  raise notice 'Maestro de Sakura';
  -- ---------------------------------------------------------------------
  perform pg_temp.suplantar('maestro@sakura.test');

  select count(*) into v_n from public.usuarios where dojo_id = v_tigre;
  perform pg_temp.afirmar(v_n = 0, 'no ve ningun usuario del Dojo Tigre');

  select count(*) into v_n from public.usuarios;
  perform pg_temp.afirmar(v_n = 4, 've los 4 usuarios de su propio dojo y solo esos');

  select count(*) into v_n from public.dojos;
  perform pg_temp.afirmar(v_n = 1, 've unicamente su propio dojo');

  update public.usuarios set nombre = 'Intruso' where dojo_id = v_tigre;
  get diagnostics v_n = row_count;
  perform pg_temp.afirmar(v_n = 0, 'un UPDATE cruzado al otro dojo afecta 0 filas');

  update public.usuarios set nombre = 'Yukiko'
    where dojo_id = v_sakura and rol = 'sensei';
  get diagnostics v_n = row_count;
  perform pg_temp.afirmar(v_n = 1, 'si puede editar al sensei de su dojo');

  -- ---------------------------------------------------------------------
  raise notice 'Sensei de Sakura';
  -- ---------------------------------------------------------------------
  perform pg_temp.suplantar('sensei@sakura.test');

  select count(*) into v_n from public.usuarios where dojo_id = v_tigre;
  perform pg_temp.afirmar(v_n = 0, 'no ve usuarios del otro dojo');

  update public.usuarios set nombre = 'Cambiado'
    where rol = 'alumno' and dojo_id = v_sakura;
  get diagnostics v_n = row_count;
  perform pg_temp.afirmar(v_n = 0, 'no puede editar a otros usuarios de su dojo');

  begin
    update public.usuarios set rol = 'maestro' where id = auth.uid();
    perform pg_temp.afirmar(false, 'no puede promoverse a maestro');
  exception when insufficient_privilege then
    perform pg_temp.afirmar(true, 'no puede promoverse a maestro');
  end;

  update public.usuarios set telefono = '+58 412 0000000' where id = auth.uid();
  get diagnostics v_n = row_count;
  perform pg_temp.afirmar(v_n = 1, 'si puede editar su propio perfil');

  -- ---------------------------------------------------------------------
  raise notice 'Alumno de Tigre';
  -- ---------------------------------------------------------------------
  perform pg_temp.suplantar('alumno@tigre.test');

  select count(*) into v_n from public.usuarios where dojo_id = v_sakura;
  perform pg_temp.afirmar(v_n = 0, 'no ve usuarios del Dojo Sakura');

  select count(*) into v_n from public.dojos where id = v_sakura;
  perform pg_temp.afirmar(v_n = 0, 'no ve el Dojo Sakura');

  begin
    insert into public.usuarios (id, dojo_id, rol, nombre, apellido, email)
    values (gen_random_uuid(), v_tigre, 'alumno', 'Falso', 'Alumno', 'falso@tigre.test');
    perform pg_temp.afirmar(false, 'no puede crear usuarios');
  exception when insufficient_privilege then
    perform pg_temp.afirmar(true, 'no puede crear usuarios');
  end;

  -- ---------------------------------------------------------------------
  raise notice 'Maestro de Tigre';
  -- ---------------------------------------------------------------------
  perform pg_temp.suplantar('maestro@tigre.test');

  begin
    insert into public.usuarios (id, dojo_id, rol, nombre, apellido, email)
    values (gen_random_uuid(), v_sakura, 'alumno', 'Colado', 'Alumno', 'colado@sakura.test');
    perform pg_temp.afirmar(false, 'no puede dar de alta usuarios en otro dojo');
  exception when insufficient_privilege then
    perform pg_temp.afirmar(true, 'no puede dar de alta usuarios en otro dojo');
  end;

  begin
    select id into v_id from public.usuarios where rol = 'sensei' and dojo_id = v_tigre;
    update public.usuarios set rol = 'maestro' where id = v_id;
    perform pg_temp.afirmar(false, 'no puede promover a un sensei a maestro');
  exception when insufficient_privilege then
    perform pg_temp.afirmar(true, 'no puede promover a un sensei a maestro');
  end;

  begin
    select id into v_id from public.usuarios where rol = 'alumno' and dojo_id = v_tigre;
    update public.usuarios set dojo_id = v_sakura where id = v_id;
    perform pg_temp.afirmar(false, 'no puede mover un alumno a otro dojo');
  exception when insufficient_privilege then
    perform pg_temp.afirmar(true, 'no puede mover un alumno a otro dojo');
  end;

  -- ---------------------------------------------------------------------
  raise notice 'Superadmin';
  -- ---------------------------------------------------------------------
  perform pg_temp.suplantar('super@ossapp.test');

  select count(*) into v_n from public.dojos;
  perform pg_temp.afirmar(v_n = 2, 've los dos dojos');

  select count(*) into v_n from public.usuarios;
  perform pg_temp.afirmar(v_n = 9, 've los 9 usuarios de la plataforma');

  update public.dojos set estado_licencia = 'suspendida' where id = v_tigre;
  get diagnostics v_n = row_count;
  perform pg_temp.afirmar(v_n = 1, 'puede suspender la licencia de un dojo');

  -- =====================================================================
  raise notice 'Fase 2 - Alumnos y clases';
  -- =====================================================================

  raise notice 'Maestro de Sakura';
  perform pg_temp.suplantar('maestro@sakura.test');

  select count(*) into v_n from public.alumnos;
  perform pg_temp.afirmar(v_n = 3, 've los 3 alumnos de su dojo y ninguno del otro');

  select count(*) into v_n from public.clases;
  perform pg_temp.afirmar(v_n = 2, 've solo las clases de su dojo');

  select count(*) into v_n from public.horarios;
  perform pg_temp.afirmar(v_n = 5, 've solo los horarios de su dojo');

  insert into public.alumnos (dojo_id, nombre, apellido)
  values (v_sakura, 'Nuevo', 'Alumno');
  perform pg_temp.afirmar(true, 'puede dar de alta un alumno en su dojo');

  begin
    insert into public.alumnos (dojo_id, nombre, apellido)
    values (v_tigre, 'Colado', 'Alumno');
    perform pg_temp.afirmar(false, 'no puede dar de alta un alumno en otro dojo');
  exception when insufficient_privilege then
    perform pg_temp.afirmar(true, 'no puede dar de alta un alumno en otro dojo');
  end;

  -- Ni siquiera ve las clases del otro dojo con las que intentar el cruce.
  select count(*) into v_n from public.clases where dojo_id = v_tigre;
  perform pg_temp.afirmar(v_n = 0, 'no ve las clases del otro dojo');

  begin
    -- Con el id en la mano, el cruce lo corta el trigger de coherencia de dojo.
    select id into v_id from public.alumnos where dojo_id = v_sakura limit 1;
    insert into public.clase_alumno (dojo_id, clase_id, alumno_id)
    values (v_sakura, v_clase_tigre, v_id);
    perform pg_temp.afirmar(false, 'no puede inscribir un alumno en una clase de otro dojo');
  exception when insufficient_privilege or check_violation then
    perform pg_temp.afirmar(true, 'no puede inscribir un alumno en una clase de otro dojo');
  end;

  raise notice 'Sensei de Sakura';
  perform pg_temp.suplantar('sensei@sakura.test');

  select count(*) into v_n from public.alumnos;
  perform pg_temp.afirmar(v_n > 0, 've los alumnos de su dojo');

  begin
    insert into public.alumnos (dojo_id, nombre, apellido)
    values (v_sakura, 'Sensei', 'Intruso');
    perform pg_temp.afirmar(false, 'no puede dar de alta alumnos');
  exception when insufficient_privilege then
    perform pg_temp.afirmar(true, 'no puede dar de alta alumnos');
  end;

  raise notice 'Representante de Sakura';
  perform pg_temp.suplantar('representante@sakura.test');

  select count(*) into v_n from public.alumnos;
  perform pg_temp.afirmar(v_n = 3, 've unicamente los alumnos que tiene asignados');

  select count(*) into v_n from public.alumnos where dojo_id = v_tigre;
  perform pg_temp.afirmar(v_n = 0, 'no ve alumnos del otro dojo');

  update public.alumnos set nombre = 'Editado' where dojo_id = v_sakura;
  get diagnostics v_n = row_count;
  perform pg_temp.afirmar(v_n = 0, 'no puede editar la ficha de sus alumnos');

  raise notice 'Alumno de Tigre';
  perform pg_temp.suplantar('alumno@tigre.test');

  select count(*) into v_n from public.alumnos;
  perform pg_temp.afirmar(v_n = 1, 've solo su propia ficha');

  select count(*) into v_n from public.clases;
  perform pg_temp.afirmar(v_n = 2, 've el catalogo de clases de su dojo');

  select count(*) into v_n from public.clase_alumno;
  perform pg_temp.afirmar(v_n = 1, 've solo su propia inscripcion a clase');

  raise notice 'Superadmin';
  perform pg_temp.suplantar('super@ossapp.test');

  select count(*) into v_n from public.alumnos;
  perform pg_temp.afirmar(v_n = 0, 'no ve datos operativos de ningun dojo (solo licencias y soporte)');

  -- =====================================================================
  raise notice 'Fase 3 - Asistencia por QR';
  -- =====================================================================

  perform pg_temp.volver_a_admin();

  select token into v_token_sakura from public.codigos_qr where dojo_id = v_sakura;
  select token into v_token_tigre  from public.codigos_qr where dojo_id = v_tigre;

  -- El alumno con cuenta propia de Sakura y su clase.
  select a.id, ca.clase_id into v_alumno_sakura, v_clase_sakura
  from public.alumnos a
  join public.clase_alumno ca on ca.alumno_id = a.id
  where a.dojo_id = v_sakura and a.usuario_id is not null
  limit 1;

  -- Companero de clase, capturado como admin: mas abajo ninguno de los roles
  -- suplantados puede leer su id, y hace falta para probar la autorizacion.
  select a.id into v_otro_alumno
  from public.alumnos a
  join public.clase_alumno ca on ca.alumno_id = a.id
  where a.dojo_id = v_sakura and a.id <> v_alumno_sakura and ca.clase_id = v_clase_sakura
  limit 1;

  -- Franja que cubre justo este momento, para poder probar el escaneo hoy.
  insert into public.horarios (dojo_id, clase_id, dia_semana, hora_inicio, hora_fin)
  values (
    v_sakura, v_clase_sakura,
    extract(dow from current_date)::smallint,
    localtime - interval '5 minutes',
    localtime + interval '55 minutes'
  );

  raise notice 'Alumno de Sakura escanea el QR';
  perform pg_temp.suplantar('alumno@sakura.test');

  v_asistencia := public.registrar_asistencia_qr(v_token_sakura, v_alumno_sakura);
  perform pg_temp.afirmar(v_asistencia.id is not null, 'registra su asistencia con el QR de su dojo');
  perform pg_temp.afirmar(v_asistencia.origen = 'qr', 'la asistencia queda marcada con origen qr');

  -- Escanear dos veces no debe duplicar ni fallar.
  v_asistencia := public.registrar_asistencia_qr(v_token_sakura, v_alumno_sakura);
  select count(*) into v_n
  from public.asistencias
  where alumno_id = v_alumno_sakura and fecha = current_date;
  perform pg_temp.afirmar(v_n = 1, 'escanear dos veces no duplica la asistencia');

  begin
    perform public.registrar_asistencia_qr(v_token_tigre, v_alumno_sakura);
    perform pg_temp.afirmar(false, 'el QR del otro dojo no le sirve');
  exception when insufficient_privilege then
    perform pg_temp.afirmar(true, 'el QR del otro dojo no le sirve');
  end;

  begin
    -- Alumno ajeno: ni es su ficha ni es su representado.
    perform public.registrar_asistencia_qr(v_token_sakura, v_otro_alumno);
    perform pg_temp.afirmar(false, 'no puede marcar asistencia por un alumno ajeno');
  exception when insufficient_privilege then
    perform pg_temp.afirmar(true, 'no puede marcar asistencia por un alumno ajeno');
  end;

  begin
    insert into public.asistencias (dojo_id, alumno_id, clase_id, origen)
    values (v_sakura, v_alumno_sakura, v_clase_sakura, 'manual');
    perform pg_temp.afirmar(false, 'no puede insertar asistencia saltandose la validacion de horario');
  exception when insufficient_privilege then
    perform pg_temp.afirmar(true, 'no puede insertar asistencia saltandose la validacion de horario');
  end;

  raise notice 'Alumno de Tigre fuera de horario';
  perform pg_temp.suplantar('alumno@tigre.test');

  begin
    select a.id into v_id from public.alumnos a where a.dojo_id = v_tigre and a.usuario_id is not null;
    perform public.registrar_asistencia_qr(v_token_tigre, v_id);
    perform pg_temp.afirmar(false, 'sin clase en horario no se registra asistencia');
  exception when no_data_found then
    perform pg_temp.afirmar(true, 'sin clase en horario no se registra asistencia');
  end;

  raise notice 'Sensei de Sakura marca manualmente';
  perform pg_temp.suplantar('sensei@sakura.test');

  insert into public.asistencias (dojo_id, alumno_id, clase_id, origen)
  values (v_sakura, v_otro_alumno, v_clase_sakura, 'manual');
  get diagnostics v_n = row_count;
  perform pg_temp.afirmar(v_n = 1, 'puede marcar asistencia manual en la clase que imparte');

  select count(*) into v_n from public.asistencias;
  perform pg_temp.afirmar(v_n = 2, 've las asistencias de su dojo');

  begin
    insert into public.asistencias (dojo_id, alumno_id, clase_id, origen)
    values (v_tigre, v_otro_alumno, v_clase_tigre, 'manual');
    perform pg_temp.afirmar(false, 'no puede marcar asistencia en el otro dojo');
  exception when insufficient_privilege then
    perform pg_temp.afirmar(true, 'no puede marcar asistencia en el otro dojo');
  end;

  raise notice 'Representante de Sakura';
  perform pg_temp.suplantar('representante@sakura.test');

  select count(*) into v_n from public.asistencias;
  perform pg_temp.afirmar(v_n = 2, 've la asistencia de sus representados');

  perform pg_temp.suplantar('alumno@tigre.test');
  select count(*) into v_n from public.asistencias;
  perform pg_temp.afirmar(v_n = 0, 'un alumno del otro dojo no ve ninguna de esas asistencias');

  -- =====================================================================
  raise notice 'Fase 4 - Pagos y solvencia';
  -- =====================================================================

  perform pg_temp.volver_a_admin();
  select id into v_pago_tigre from public.pagos where dojo_id = v_tigre and estado = 'pendiente' limit 1;
  -- Como admin, porque desde Sakura esta fila es invisible y hace falta su id
  -- para que el INSERT llegue a evaluarse contra la politica.
  select id into v_alumno_tigre from public.alumnos where dojo_id = v_tigre limit 1;

  raise notice 'Representante de Sakura';
  perform pg_temp.suplantar('representante@sakura.test');

  select count(*) into v_n from public.pagos;
  perform pg_temp.afirmar(v_n = 3, 've solo los pagos de sus representados');

  select count(*) into v_n from public.pagos where dojo_id = v_tigre;
  perform pg_temp.afirmar(v_n = 0, 'no ve ningun pago del otro dojo');

  -- Sube un comprobante nuevo para el mes que viene.
  insert into public.pagos (dojo_id, alumno_id, periodo, monto, comprobante_url)
  select v_sakura, a.id,
         (date_trunc('month', current_date) + interval '1 month')::date,
         35.00, 'demo/nuevo.jpg'
  from public.alumnos a
  where a.dojo_id = v_sakura
  order by a.creado_el
  limit 1
  returning id into v_pago_id;
  perform pg_temp.afirmar(v_pago_id is not null, 'puede subir un comprobante de pago');

  select count(*) into v_n from public.pagos where id = v_pago_id and estado = 'pendiente';
  perform pg_temp.afirmar(v_n = 1, 'el pago entra como pendiente de verificacion');

  begin
    -- Autoaprobarse el pago es el ataque obvio de este flujo.
    update public.pagos set estado = 'aprobado' where id = v_pago_id;
    perform pg_temp.afirmar(false, 'no puede aprobar su propio pago');
  exception when insufficient_privilege or check_violation then
    perform pg_temp.afirmar(true, 'no puede aprobar su propio pago');
  end;

  begin
    insert into public.pagos (dojo_id, alumno_id, periodo, monto)
    values (v_tigre, v_alumno_tigre, date_trunc('month', current_date)::date, 35.00);
    perform pg_temp.afirmar(false, 'no puede registrar pagos en el otro dojo');
  exception when insufficient_privilege then
    perform pg_temp.afirmar(true, 'no puede registrar pagos en el otro dojo');
  end;

  raise notice 'Maestro de Sakura verifica';
  perform pg_temp.suplantar('maestro@sakura.test');

  select count(*) into v_n from public.pagos where estado = 'pendiente';
  perform pg_temp.afirmar(v_n = 2, 've la bandeja de pagos pendientes de su dojo');

  update public.pagos set estado = 'aprobado' where id = v_pago_id;
  get diagnostics v_n = row_count;
  perform pg_temp.afirmar(v_n = 1, 'puede aprobar un pago de su dojo');

  select count(*) into v_n
  from public.pagos
  where id = v_pago_id and verificado_por is not null and verificado_el is not null;
  perform pg_temp.afirmar(v_n = 1, 'el servidor sella quien y cuando verifico');

  begin
    -- Rechazar sin motivo deja a la familia sin saber que corregir.
    update public.pagos set estado = 'rechazado', motivo_rechazo = null where id = v_pago_id;
    perform pg_temp.afirmar(false, 'no puede rechazar un pago sin indicar motivo');
  exception when check_violation then
    perform pg_temp.afirmar(true, 'no puede rechazar un pago sin indicar motivo');
  end;

  update public.pagos set estado = 'rechazado', motivo_rechazo = 'Comprobante ilegible'
  where id = v_pago_id;
  get diagnostics v_n = row_count;
  perform pg_temp.afirmar(v_n = 1, 'puede rechazar indicando el motivo');

  update public.pagos set estado = 'aprobado' where id = v_pago_tigre;
  get diagnostics v_n = row_count;
  perform pg_temp.afirmar(v_n = 0, 'no puede verificar pagos del otro dojo');

  raise notice 'Solvencia';
  select count(*) into v_n from public.vista_solvencia where solvente;
  perform pg_temp.afirmar(v_n = 1, 'la vista de solvencia marca al alumno al dia');

  -- Se comprueba el aislamiento, no un numero fijo: la propia suite ha dado de
  -- alta un alumno antes y el total cambia.
  select count(*) into v_n from public.vista_solvencia where dojo_id <> v_sakura;
  perform pg_temp.afirmar(v_n = 0, 'la vista de solvencia no filtra ningun alumno del otro dojo');

  raise notice 'Sensei de Sakura';
  perform pg_temp.suplantar('sensei@sakura.test');

  select count(*) into v_n from public.pagos;
  perform pg_temp.afirmar(v_n > 0, 've los pagos de su dojo');

  -- Sin politica de UPDATE que le aplique, la fila queda fuera del USING y el
  -- UPDATE afecta 0 filas en vez de lanzar error. Se comprueba el efecto.
  update public.pagos set estado = 'aprobado' where id = v_pago_id;
  get diagnostics v_n = row_count;
  perform pg_temp.afirmar(v_n = 0, 'el sensei no puede verificar pagos');

  select count(*) into v_n from public.pagos where id = v_pago_id and estado = 'rechazado';
  perform pg_temp.afirmar(v_n = 1, 'el pago rechazado por el maestro sigue rechazado');

  -- =====================================================================
  raise notice 'Fase 5 - Grados y cinturones';
  -- =====================================================================

  perform pg_temp.volver_a_admin();
  select id into v_cint_verde from public.cinturones where dojo_id = v_sakura and orden = 2;
  select id into v_cint_tigre from public.cinturones where dojo_id = v_tigre  and orden = 2;

  raise notice 'Alumno de Sakura';
  perform pg_temp.suplantar('alumno@sakura.test');

  select count(*) into v_n from public.cinturones;
  perform pg_temp.afirmar(v_n = 7, 've la escala de cinturones de su dojo');

  select count(*) into v_n from public.cinturones where dojo_id = v_tigre;
  perform pg_temp.afirmar(v_n = 0, 'no ve la escala del otro dojo');

  select count(*) into v_n from public.examenes;
  perform pg_temp.afirmar(v_n = 1, 've unicamente su propio historial de examenes');

  select count(*) into v_n from public.certificados;
  perform pg_temp.afirmar(v_n = 1, 've su certificado');

  select * into v_progreso from public.progreso_de_grado(v_alumno_sakura);
  perform pg_temp.afirmar(v_progreso.cinturon_actual = 'Amarillo', 'su cinturon actual es el que le dio el examen aprobado');
  perform pg_temp.afirmar(v_progreso.siguiente_cinturon = 'Naranja', 'el siguiente grado es el inmediato superior');
  perform pg_temp.afirmar(v_progreso.asistencias_minimas > 0, 'el progreso trae los requisitos definidos por el maestro');

  begin
    -- Autoaprobarse un examen es el ataque obvio de esta fase.
    insert into public.examenes (dojo_id, alumno_id, cinturon_destino_id, resultado)
    values (v_sakura, v_alumno_sakura, v_cint_verde, 'aprobado');
    perform pg_temp.afirmar(false, 'no puede registrarse un examen a si mismo');
  exception when insufficient_privilege then
    perform pg_temp.afirmar(true, 'no puede registrarse un examen a si mismo');
  end;

  raise notice 'Sensei de Sakura registra examen';
  perform pg_temp.suplantar('sensei@sakura.test');

  insert into public.examenes (dojo_id, alumno_id, cinturon_destino_id, resultado, observaciones)
  values (v_sakura, v_alumno_sakura, v_cint_verde, 'aprobado', 'Kata solido');
  get diagnostics v_n = row_count;
  perform pg_temp.afirmar(v_n = 1, 'el sensei puede registrar un examen');

  perform pg_temp.volver_a_admin();
  select count(*) into v_n
  from public.alumnos a join public.cinturones c on c.id = a.cinturon_actual_id
  where a.id = v_alumno_sakura and c.orden = 2;
  perform pg_temp.afirmar(v_n = 1, 'aprobar sube automaticamente el cinturon del alumno');

  select count(*) into v_n from public.certificados where alumno_id = v_alumno_sakura;
  perform pg_temp.afirmar(v_n = 2, 'aprobar emite el certificado automaticamente');

  raise notice 'Un examen reprobado no mueve el cinturon';
  perform pg_temp.suplantar('sensei@sakura.test');
  insert into public.examenes (dojo_id, alumno_id, cinturon_destino_id, fecha, resultado)
  select v_sakura, v_alumno_sakura, c.id, current_date - 1, 'reprobado'
  from public.cinturones c where c.dojo_id = v_sakura and c.orden = 3;

  perform pg_temp.volver_a_admin();
  select count(*) into v_n
  from public.alumnos a join public.cinturones c on c.id = a.cinturon_actual_id
  where a.id = v_alumno_sakura and c.orden = 2;
  perform pg_temp.afirmar(v_n = 1, 'reprobar deja el cinturon como estaba');

  raise notice 'Sensei no puede examinar en el otro dojo';
  perform pg_temp.suplantar('sensei@sakura.test');
  begin
    insert into public.examenes (dojo_id, alumno_id, cinturon_destino_id, resultado)
    values (v_tigre, v_alumno_tigre, v_cint_tigre, 'aprobado');
    perform pg_temp.afirmar(false, 'no puede registrar examenes en el otro dojo');
  exception when insufficient_privilege then
    perform pg_temp.afirmar(true, 'no puede registrar examenes en el otro dojo');
  end;

  raise notice 'El sensei no define los requisitos';
  begin
    update public.requisitos_grado set asistencias_minimas = 0 where dojo_id = v_sakura;
    get diagnostics v_n = row_count;
    perform pg_temp.afirmar(v_n = 0, 'el sensei no puede cambiar los requisitos de grado');
  exception when insufficient_privilege then
    perform pg_temp.afirmar(true, 'el sensei no puede cambiar los requisitos de grado');
  end;

  raise notice 'Maestro de Sakura';
  perform pg_temp.suplantar('maestro@sakura.test');
  update public.requisitos_grado set asistencias_minimas = 15 where cinturon_id = v_cint_verde;
  get diagnostics v_n = row_count;
  perform pg_temp.afirmar(v_n = 1, 'el maestro si define los requisitos de su dojo');

  update public.requisitos_grado set asistencias_minimas = 1 where cinturon_id = v_cint_tigre;
  get diagnostics v_n = row_count;
  perform pg_temp.afirmar(v_n = 0, 'no puede tocar los requisitos del otro dojo');

  raise notice 'Alumno de Tigre';
  perform pg_temp.suplantar('alumno@tigre.test');
  select count(*) into v_n from public.certificados where dojo_id = v_sakura;
  perform pg_temp.afirmar(v_n = 0, 'no ve certificados del otro dojo');

  -- =====================================================================
  raise notice 'Fase 6 - Eventos e inscripciones';
  -- =====================================================================

  perform pg_temp.volver_a_admin();
  select id into v_evento_sakura from public.eventos where dojo_id = v_sakura and costo > 0 limit 1;
  select id into v_evento_tigre  from public.eventos where dojo_id = v_tigre  and costo > 0 limit 1;

  raise notice 'Representante de Sakura';
  perform pg_temp.suplantar('representante@sakura.test');

  select count(*) into v_n from public.eventos;
  perform pg_temp.afirmar(v_n = 2, 've la cartelera de su dojo y solo la suya');

  select count(*) into v_n from public.inscripciones;
  perform pg_temp.afirmar(v_n = 1, 've solo las inscripciones de sus representados');

  -- Inscribe a otro de sus alumnos en el mismo evento.
  insert into public.inscripciones (dojo_id, evento_id, alumno_id, comprobante_url)
  select v_sakura, v_evento_sakura, a.id, 'demo/otra.jpg'
  from public.alumnos a
  where a.dojo_id = v_sakura and a.id <> v_alumno_sakura
  limit 1;
  get diagnostics v_n = row_count;
  perform pg_temp.afirmar(v_n = 1, 'puede inscribir a sus alumnos');

  select count(*) into v_n
  from public.inscripciones
  where evento_id = v_evento_sakura and estado = 'pendiente';
  perform pg_temp.afirmar(v_n = 2, 'la inscripcion entra pendiente de verificacion');

  begin
    insert into public.inscripciones (dojo_id, evento_id, alumno_id)
    values (v_tigre, v_evento_tigre, v_alumno_tigre);
    perform pg_temp.afirmar(false, 'no puede inscribir en eventos del otro dojo');
  exception when insufficient_privilege then
    perform pg_temp.afirmar(true, 'no puede inscribir en eventos del otro dojo');
  end;

  begin
    update public.inscripciones set estado = 'aprobado' where evento_id = v_evento_sakura;
    get diagnostics v_n = row_count;
    perform pg_temp.afirmar(v_n = 0, 'no puede aprobarse su propia inscripcion');
  exception when insufficient_privilege or check_violation then
    perform pg_temp.afirmar(true, 'no puede aprobarse su propia inscripcion');
  end;

  raise notice 'Control de cupo';
  perform pg_temp.volver_a_admin();
  update public.eventos set cupo = 2 where id = v_evento_sakura;

  perform pg_temp.suplantar('maestro@sakura.test');
  begin
    insert into public.inscripciones (dojo_id, evento_id, alumno_id)
    select v_sakura, v_evento_sakura, a.id
    from public.alumnos a
    where a.dojo_id = v_sakura
      and a.id not in (select alumno_id from public.inscripciones where evento_id = v_evento_sakura)
    limit 1;
    perform pg_temp.afirmar(false, 'no se puede pasar del cupo del evento');
  exception when no_data_found then
    perform pg_temp.afirmar(true, 'no se puede pasar del cupo del evento');
  end;

  raise notice 'Maestro de Sakura verifica inscripciones';
  update public.inscripciones set estado = 'aprobado' where evento_id = v_evento_sakura;
  get diagnostics v_n = row_count;
  perform pg_temp.afirmar(v_n = 2, 'el maestro si puede aprobar inscripciones de su dojo');

  update public.eventos set nombre = 'Secuestrado' where dojo_id = v_tigre;
  get diagnostics v_n = row_count;
  perform pg_temp.afirmar(v_n = 0, 'no puede editar eventos del otro dojo');

  raise notice 'Sensei no crea eventos';
  perform pg_temp.suplantar('sensei@sakura.test');
  begin
    insert into public.eventos (dojo_id, nombre, fecha)
    values (v_sakura, 'Evento del sensei', current_date + 7);
    perform pg_temp.afirmar(false, 'el sensei no crea eventos');
  exception when insufficient_privilege then
    perform pg_temp.afirmar(true, 'el sensei no crea eventos');
  end;

  -- =====================================================================
  raise notice 'Fase 7 - Plataforma: licencias y soporte';
  -- =====================================================================

  perform pg_temp.volver_a_admin();
  select id into v_susc_tigre from public.suscripciones
  where dojo_id = v_tigre and estado = 'pendiente' limit 1;
  select id into v_ticket from public.tickets_soporte limit 1;

  raise notice 'Maestro de Sakura';
  perform pg_temp.suplantar('maestro@sakura.test');

  select count(*) into v_n from public.suscripciones;
  perform pg_temp.afirmar(v_n = 2, 've solo las suscripciones de su propio dojo');

  update public.suscripciones set estado = 'aprobado' where dojo_id = v_sakura and estado = 'pendiente';
  get diagnostics v_n = row_count;
  perform pg_temp.afirmar(v_n = 0, 'no puede aprobarse su propia suscripcion');

  select count(*) into v_n from public.tickets_soporte;
  perform pg_temp.afirmar(v_n = 0, 'no ve los tickets de otros dojos');

  insert into public.tickets_soporte (dojo_id, abierto_por, asunto, descripcion)
  values (v_sakura, auth.uid(), 'Duda de facturacion', 'Necesito la factura del mes pasado.');
  get diagnostics v_n = row_count;
  perform pg_temp.afirmar(v_n = 1, 'puede abrir un ticket de soporte');

  raise notice 'Superadmin';
  perform pg_temp.suplantar('super@ossapp.test');

  select count(*) into v_n from public.suscripciones;
  perform pg_temp.afirmar(v_n = 4, 've las suscripciones de todos los dojos');

  select count(*) into v_n from public.tickets_soporte;
  perform pg_temp.afirmar(v_n = 2, 've la bandeja de soporte completa');

  -- Aprobar la suscripcion debe renovar la licencia sin un segundo paso manual.
  perform pg_temp.volver_a_admin();
  update public.dojos set estado_licencia = 'vencida' where id = v_tigre;
  perform pg_temp.suplantar('super@ossapp.test');

  update public.suscripciones set estado = 'aprobado' where id = v_susc_tigre;
  get diagnostics v_n = row_count;
  perform pg_temp.afirmar(v_n = 1, 'puede verificar el pago de suscripcion de un dojo');

  select count(*) into v_n
  from public.dojos where id = v_tigre and estado_licencia = 'activa';
  perform pg_temp.afirmar(v_n = 1, 'aprobar la suscripcion reactiva la licencia automaticamente');

  update public.tickets_soporte set estado = 'cerrado', respuesta = 'Resuelto por telefono.'
  where id = v_ticket;
  get diagnostics v_n = row_count;
  perform pg_temp.afirmar(v_n = 1, 'puede responder y cerrar un ticket');

  select count(*) into v_n
  from public.tickets_soporte where id = v_ticket and cerrado_el is not null;
  perform pg_temp.afirmar(v_n = 1, 'el cierre del ticket queda fechado por el servidor');

  select count(*) into v_n from public.metricas_plataforma();
  perform pg_temp.afirmar(v_n = 2, 'las metricas globales cubren los dos dojos');

  -- El limite del superadmin: agregados si, datos operativos no.
  select count(*) into v_n from public.alumnos;
  perform pg_temp.afirmar(v_n = 0, 'sigue sin ver alumnos de ningun dojo');
  select count(*) into v_n from public.pagos;
  perform pg_temp.afirmar(v_n = 0, 'sigue sin ver pagos de ningun dojo');
  select count(*) into v_n from public.eventos;
  perform pg_temp.afirmar(v_n = 0, 'sigue sin ver eventos de ningun dojo');

  raise notice 'Un maestro no puede usar las metricas globales';
  perform pg_temp.suplantar('maestro@sakura.test');
  select count(*) into v_n from public.metricas_plataforma();
  perform pg_temp.afirmar(v_n = 0, 'las metricas globales no devuelven nada a un maestro');

  -- =====================================================================
  raise notice 'Fase 8 - Notificaciones';
  -- =====================================================================

  raise notice 'Representante de Sakura';
  perform pg_temp.suplantar('representante@sakura.test');

  select count(*) into v_n from public.notificaciones;
  perform pg_temp.afirmar(v_n > 0, 'recibe notificaciones de sus alumnos');

  select count(*) into v_n from public.notificaciones where usuario_id <> auth.uid();
  perform pg_temp.afirmar(v_n = 0, 'no ve notificaciones de nadie mas');

  select count(*) into v_n from public.notificaciones where tipo = 'evento_nuevo';
  perform pg_temp.afirmar(v_n = 2, 'le llegaron los eventos nuevos de su dojo');

  select count(*) into v_n from public.notificaciones where tipo = 'inscripcion_resuelta';
  perform pg_temp.afirmar(v_n > 0, 'le llego el resultado de la inscripcion al evento');

  update public.notificaciones set leida = true where usuario_id = auth.uid();
  get diagnostics v_n = row_count;
  perform pg_temp.afirmar(v_n > 0, 'puede marcar sus notificaciones como leidas');

  begin
    insert into public.notificaciones (usuario_id, tipo, titulo, cuerpo)
    values (auth.uid(), 'licencia', 'Falsa', 'No deberia poder crearla');
    perform pg_temp.afirmar(false, 'no puede fabricarse notificaciones');
  exception when insufficient_privilege then
    perform pg_temp.afirmar(true, 'no puede fabricarse notificaciones');
  end;

  insert into public.dispositivos (usuario_id, push_token, plataforma)
  values (auth.uid(), 'ExponentPushToken[demo]', 'android');
  get diagnostics v_n = row_count;
  perform pg_temp.afirmar(v_n = 1, 'puede registrar su dispositivo para push');

  begin
    insert into public.dispositivos (usuario_id, push_token, plataforma)
    values (v_alumno_tigre, 'ExponentPushToken[ajeno]', 'android');
    perform pg_temp.afirmar(false, 'no puede registrar dispositivos de otros');
  exception when insufficient_privilege or foreign_key_violation then
    perform pg_temp.afirmar(true, 'no puede registrar dispositivos de otros');
  end;

  -- ---------------------------------------------------------------------
  raise notice 'Sin sesion (rol anon)';
  -- ---------------------------------------------------------------------
  perform pg_temp.volver_a_admin();
  perform set_config('role', 'anon', true);

  begin
    select count(*) into v_n from public.usuarios;
    perform pg_temp.afirmar(false, 'anon no puede leer usuarios');
  exception when insufficient_privilege then
    perform pg_temp.afirmar(true, 'anon no puede leer usuarios');
  end;

  begin
    select count(*) into v_n from public.alumnos;
    perform pg_temp.afirmar(false, 'anon no puede leer alumnos');
  exception when insufficient_privilege then
    perform pg_temp.afirmar(true, 'anon no puede leer alumnos');
  end;

  perform pg_temp.volver_a_admin();
  raise notice 'TODAS LAS ASERCIONES DE AISLAMIENTO PASARON';
end;
$$;

-- No se conservan los cambios: la prueba no debe ensuciar los datos de trabajo.
rollback;
