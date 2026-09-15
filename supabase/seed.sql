-- =============================================================================
-- Datos de prueba (solo entorno local).
--
-- Se cargan con `npm run db:reset`. Dos dojos completos + un superadmin: es lo
-- que permite demostrar que un dojo no ve nada del otro.
--
-- Contrasena de TODAS las cuentas: ossapp123
-- =============================================================================

-- Helper local: crea el usuario en Auth con contrasena. El trigger
-- on_auth_user_created se encarga de la fila en public.usuarios.
create or replace function pg_temp.crear_usuario(
  p_email    text,
  p_rol      public.rol_usuario,
  p_dojo_id  uuid,
  p_nombre   text,
  p_apellido text
) returns uuid
language plpgsql
as $$
declare
  v_id uuid := gen_random_uuid();
begin
  -- Los campos de token van a cadena vacia, nunca NULL: GoTrue los lee como
  -- string de Go y un NULL hace fallar el login con "Database error querying schema".
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    confirmation_token, recovery_token, email_change, email_change_token_new,
    raw_app_meta_data, raw_user_meta_data
  ) values (
    '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated',
    p_email, crypt('ossapp123', gen_salt('bf')),
    now(), now(), now(),
    '', '', '', '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object(
      'rol', p_rol::text,
      'dojo_id', coalesce(p_dojo_id::text, ''),
      'nombre', p_nombre,
      'apellido', p_apellido
    )
  );

  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (
    gen_random_uuid(), v_id, v_id::text,
    jsonb_build_object('sub', v_id::text, 'email', p_email, 'email_verified', true),
    'email', now(), now(), now()
  );

  return v_id;
end;
$$;

do $$
declare
  v_sakura uuid := '11111111-1111-4111-8111-111111111111';
  v_tigre  uuid := '22222222-2222-4222-8222-222222222222';
begin
  insert into public.dojos (id, nombre, slug, estado_licencia, licencia_vence_el)
  values
    (v_sakura, 'Dojo Sakura', 'dojo-sakura', 'activa', current_date + 180),
    (v_tigre,  'Dojo Tigre',  'dojo-tigre',  'prueba', current_date + 21);

  -- Plataforma
  perform pg_temp.crear_usuario('super@ossapp.test', 'superadmin', null, 'Ana', 'Plataforma');

  -- Dojo Sakura
  perform pg_temp.crear_usuario('maestro@sakura.test',       'maestro',       v_sakura, 'Hiroshi', 'Tanaka');
  perform pg_temp.crear_usuario('sensei@sakura.test',        'sensei',        v_sakura, 'Yuki',    'Mori');
  perform pg_temp.crear_usuario('representante@sakura.test', 'representante', v_sakura, 'Carmen',  'Rojas');
  perform pg_temp.crear_usuario('alumno@sakura.test',        'alumno',        v_sakura, 'Diego',   'Rojas');

  -- Dojo Tigre
  perform pg_temp.crear_usuario('maestro@tigre.test',       'maestro',       v_tigre, 'Marcos',  'Duarte');
  perform pg_temp.crear_usuario('sensei@tigre.test',        'sensei',        v_tigre, 'Lucia',   'Peña');
  perform pg_temp.crear_usuario('representante@tigre.test', 'representante', v_tigre, 'Pedro',   'Salas');
  perform pg_temp.crear_usuario('alumno@tigre.test',        'alumno',        v_tigre, 'Sofia',   'Salas');
end;
$$;

-- -----------------------------------------------------------------------------
-- Fase 2: alumnos, clases y horarios en los dos dojos.
-- -----------------------------------------------------------------------------

do $$
declare
  v_sakura uuid := '11111111-1111-4111-8111-111111111111';
  v_tigre  uuid := '22222222-2222-4222-8222-222222222222';
  v_dojo   uuid;
  v_sensei uuid;
  v_rep    uuid;
  v_cuenta uuid;
  v_clase_inf uuid;
  v_clase_adu uuid;
  v_alumno uuid;
  v_slug   text;
  v_nombres text[] := array['Diego', 'Sofia', 'Mateo', 'Valentina', 'Luis', 'Camila'];
  i int;
begin
  foreach v_slug in array array['dojo-sakura', 'dojo-tigre'] loop
    select id into v_dojo from public.dojos where slug = v_slug;
    v_dojo := coalesce(v_dojo, case when v_slug = 'dojo-sakura' then v_sakura else v_tigre end);

    select id into v_sensei from public.usuarios where dojo_id = v_dojo and rol = 'sensei';
    select id into v_rep    from public.usuarios where dojo_id = v_dojo and rol = 'representante';
    select id into v_cuenta from public.usuarios where dojo_id = v_dojo and rol = 'alumno';

    insert into public.clases (dojo_id, sensei_id, nombre, nivel, capacidad)
    values (v_dojo, v_sensei, 'Karate infantil', 'infantil', 20)
    returning id into v_clase_inf;

    insert into public.clases (dojo_id, sensei_id, nombre, nivel, capacidad)
    values (v_dojo, v_sensei, 'Karate adultos', 'adultos', 25)
    returning id into v_clase_adu;

    -- Lunes, miercoles y viernes
    insert into public.horarios (dojo_id, clase_id, dia_semana, hora_inicio, hora_fin)
    values
      (v_dojo, v_clase_inf, 1, '17:00', '18:00'),
      (v_dojo, v_clase_inf, 3, '17:00', '18:00'),
      (v_dojo, v_clase_inf, 5, '17:00', '18:00'),
      (v_dojo, v_clase_adu, 1, '19:00', '20:30'),
      (v_dojo, v_clase_adu, 4, '19:00', '20:30');

    for i in 1..3 loop
      insert into public.alumnos (dojo_id, usuario_id, nombre, apellido, fecha_nacimiento, notas)
      values (
        v_dojo,
        -- El primer alumno de cada dojo es el que tiene cuenta propia.
        case when i = 1 then v_cuenta else null end,
        v_nombres[((i - 1) * 2) + 1],
        case when v_slug = 'dojo-sakura' then 'Rojas' else 'Salas' end,
        current_date - ((8 + i) * 365),
        case when i = 2 then 'Alergia al polen.' else null end
      )
      returning id into v_alumno;

      insert into public.representante_alumno (dojo_id, representante_id, alumno_id, parentesco)
      values (v_dojo, v_rep, v_alumno, case when i = 1 then 'Madre' else 'Tutora' end);

      insert into public.clase_alumno (dojo_id, clase_id, alumno_id)
      values (v_dojo, case when i = 3 then v_clase_adu else v_clase_inf end, v_alumno);
    end loop;
  end loop;
end;
$$;

-- -----------------------------------------------------------------------------
-- Fase 4: planes de pago y comprobantes en distintos estados.
-- -----------------------------------------------------------------------------

do $$
declare
  v_dojo    uuid;
  v_plan    uuid;
  v_maestro uuid;
  v_rep     uuid;
  v_alumno  uuid;
  v_slug    text;
  v_mes     date := date_trunc('month', current_date)::date;
  i         int;
begin
  foreach v_slug in array array['dojo-sakura', 'dojo-tigre'] loop
    select id into v_dojo from public.dojos where slug = v_slug;
    select id into v_maestro from public.usuarios where dojo_id = v_dojo and rol = 'maestro';
    select id into v_rep     from public.usuarios where dojo_id = v_dojo and rol = 'representante';

    insert into public.planes_pago (dojo_id, nombre, monto, periodicidad)
    values (v_dojo, 'Mensualidad', 35.00, 'mensual')
    returning id into v_plan;

    insert into public.planes_pago (dojo_id, nombre, monto, periodicidad)
    values (v_dojo, 'Trimestre', 95.00, 'trimestral');

    i := 0;
    for v_alumno in select id from public.alumnos where dojo_id = v_dojo order by creado_el loop
      i := i + 1;

      -- Alumno 1: al dia (mes anterior y actual aprobados).
      -- Alumno 2: comprobante del mes actual pendiente de verificar.
      -- Alumno 3: sin pagos, aparece como no solvente.
      if i = 1 then
        insert into public.pagos (dojo_id, alumno_id, plan_id, periodo, monto, estado,
                                  verificado_por, verificado_el, subido_por, comprobante_url)
        values
          (v_dojo, v_alumno, v_plan, (v_mes - interval '1 month')::date, 35.00, 'aprobado',
           v_maestro, now() - interval '30 days', v_rep, 'demo/comprobante-1.jpg'),
          (v_dojo, v_alumno, v_plan, v_mes, 35.00, 'aprobado',
           v_maestro, now() - interval '2 days', v_rep, 'demo/comprobante-2.jpg');

      elsif i = 2 then
        insert into public.pagos (dojo_id, alumno_id, plan_id, periodo, monto, estado,
                                  subido_por, comprobante_url, referencia)
        values (v_dojo, v_alumno, v_plan, v_mes, 35.00, 'pendiente',
                v_rep, 'demo/comprobante-3.jpg', 'Transferencia 00123');
      end if;
    end loop;
  end loop;
end;
$$;

-- -----------------------------------------------------------------------------
-- Fase 5: escala de cinturones, requisitos y un examen aprobado.
-- -----------------------------------------------------------------------------

do $$
declare
  v_dojo     uuid;
  v_slug     text;
  v_sensei   uuid;
  v_blanco   uuid;
  v_amarillo uuid;
  v_alumno   uuid;
  v_cint     record;
  i          int;
  -- Escala basica de karate; cada dojo puede cambiarla desde la app.
  v_nombres  text[] := array['Blanco', 'Amarillo', 'Naranja', 'Verde', 'Azul', 'Marron', 'Negro'];
  v_colores  text[] := array['#F7F4F1', '#E8C547', '#E08A2E', '#2E8B57', '#2E5FA3', '#6B4423', '#16120F'];
begin
  foreach v_slug in array array['dojo-sakura', 'dojo-tigre'] loop
    select id into v_dojo from public.dojos where slug = v_slug;
    select id into v_sensei from public.usuarios where dojo_id = v_dojo and rol = 'sensei';

    for i in 1..array_length(v_nombres, 1) loop
      insert into public.cinturones (dojo_id, nombre, color, orden)
      values (v_dojo, v_nombres[i], v_colores[i], i - 1);
    end loop;

    -- Requisitos crecientes: cuanto mas alto el grado, mas exigente.
    for v_cint in select id, orden from public.cinturones where dojo_id = v_dojo and orden > 0 loop
      insert into public.requisitos_grado (
        dojo_id, cinturon_id, asistencias_minimas, meses_minimos_en_grado_anterior, requiere_solvencia
      )
      values (v_dojo, v_cint.id, 20 + (v_cint.orden * 10), 3 + v_cint.orden, true);
    end loop;

    select id into v_blanco   from public.cinturones where dojo_id = v_dojo and orden = 0;
    select id into v_amarillo from public.cinturones where dojo_id = v_dojo and orden = 1;

    -- Todos arrancan en blanco.
    update public.alumnos
    set cinturon_actual_id = v_blanco, cinturon_desde = fecha_ingreso
    where dojo_id = v_dojo;

    -- El alumno con cuenta propia ya subio a amarillo: deja historial y certificado.
    select id into v_alumno
    from public.alumnos
    where dojo_id = v_dojo and usuario_id is not null
    limit 1;

    if v_alumno is not null then
      insert into public.examenes (dojo_id, alumno_id, cinturon_destino_id, fecha, resultado, evaluador_id, observaciones)
      values (v_dojo, v_alumno, v_amarillo, current_date - 60, 'aprobado', v_sensei, 'Buen kata, mejorar kumite.');
    end if;
  end loop;
end;
$$;

-- -----------------------------------------------------------------------------
-- Fases 6 y 7: eventos, inscripciones, suscripciones y soporte.
-- -----------------------------------------------------------------------------

do $$
declare
  v_dojo    uuid;
  v_slug    text;
  v_maestro uuid;
  v_rep     uuid;
  v_alumno  uuid;
  v_torneo  uuid;
  v_mes     date := date_trunc('month', current_date)::date;
begin
  foreach v_slug in array array['dojo-sakura', 'dojo-tigre'] loop
    select id into v_dojo from public.dojos where slug = v_slug;
    select id into v_maestro from public.usuarios where dojo_id = v_dojo and rol = 'maestro';
    select id into v_rep from public.usuarios where dojo_id = v_dojo and rol = 'representante';
    select id into v_alumno from public.alumnos where dojo_id = v_dojo and usuario_id is not null limit 1;

    -- Un evento de pago con cupo y otro gratuito sin limite.
    insert into public.eventos (dojo_id, nombre, descripcion, tipo, fecha, hora, lugar, cupo, costo, creado_por)
    values (v_dojo, 'Torneo interdojo', 'Categorias infantil y adultos.', 'torneo',
            current_date + 30, '09:00', 'Polideportivo municipal', 40, 15.00, v_maestro)
    returning id into v_torneo;

    insert into public.eventos (dojo_id, nombre, descripcion, tipo, fecha, lugar, costo, creado_por)
    values (v_dojo, 'Seminario de kata', 'Abierto a todos los grados.', 'seminario',
            current_date + 14, 'Dojo principal', 0, v_maestro);

    if v_alumno is not null then
      insert into public.inscripciones (dojo_id, evento_id, alumno_id, inscrito_por, comprobante_url)
      values (v_dojo, v_torneo, v_alumno, v_rep, 'demo/inscripcion-1.jpg');
    end if;

    -- Suscripcion del dojo a la plataforma: una aprobada y una pendiente.
    insert into public.suscripciones (dojo_id, periodo, monto, estado, verificado_el, subido_por, comprobante_url)
    values (v_dojo, (v_mes - interval '1 month')::date, 49.00, 'aprobado', now() - interval '28 days',
            v_maestro, 'demo/suscripcion-1.jpg');

    insert into public.suscripciones (dojo_id, periodo, monto, estado, subido_por, comprobante_url)
    values (v_dojo, v_mes, 49.00, 'pendiente', v_maestro, 'demo/suscripcion-2.jpg');
  end loop;

  -- Un ticket de soporte abierto, para que la bandeja del superadmin no este vacia.
  select id into v_dojo from public.dojos where slug = 'dojo-tigre';
  select id into v_maestro from public.usuarios where dojo_id = v_dojo and rol = 'maestro';
  insert into public.tickets_soporte (dojo_id, abierto_por, asunto, descripcion)
  values (v_dojo, v_maestro, 'No puedo imprimir el QR',
          'Al abrir la pantalla de asistencia el codigo no se muestra en la tablet del dojo.');
end;
$$;

do $$
declare
  v_total int;
begin
  select count(*) into v_total from public.usuarios;
  raise notice 'Seed cargado: % dojos, % usuarios, % alumnos, % clases, % pagos, % eventos. Contrasena: ossapp123',
    (select count(*) from public.dojos), v_total,
    (select count(*) from public.alumnos), (select count(*) from public.clases),
    (select count(*) from public.pagos), (select count(*) from public.eventos);
end;
$$;
