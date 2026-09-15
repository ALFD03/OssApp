# Modelo de datos de OssApp

Diseño completo del esquema (Fases 1–7). Las **fases 1 a 8 ya están implementadas** en
`supabase/migrations/`; el resto es el diseño acordado para que cada fase posterior
añada sus tablas sin rediseñar nada.

## Invariantes

Estas reglas aplican a **todas** las tablas, presentes y futuras:

1. **`dojo_id` obligatorio.** Toda tabla acotada a un dojo lleva `dojo_id uuid not null
   references dojos(id) on delete cascade` e índice por `dojo_id`. La única excepción es
   `usuarios`, donde `dojo_id` es `NULL` exclusivamente para el rol `superadmin`.
2. **RLS es la frontera.** El aislamiento se aplica con políticas de Row Level Security,
   nunca con filtros en cliente. Un `select` sin `where dojo_id = ...` debe devolver
   exactamente lo que el usuario tiene derecho a ver.
3. **Marcas de tiempo.** `creado_el` / `actualizado_el timestamptz not null default now()`,
   con el trigger `app.tocar_actualizado_el()`.
4. **Verificación manual reutilizada.** Los pagos de alumno y los de suscripción del dojo
   comparten la misma forma; ver *Flujo de verificación* abajo.
5. **Vocabulario en español**, igual que el spec.

## Flujo de verificación manual (forma compartida)

Todo lo que requiera aprobación humana lleva estas columnas. No se construyen dos flujos
distintos para pagos de alumno y pagos de suscripción: es el mismo.

| Columna | Tipo | Notas |
|---|---|---|
| `comprobante_url` | `text` | Ruta en Supabase Storage (imagen o PDF). |
| `estado` | `estado_verificacion` | `pendiente` → `aprobado` \| `rechazado`. |
| `motivo_rechazo` | `text` | Obligatorio si `estado = 'rechazado'` (CHECK). |
| `verificado_por` | `uuid → usuarios` | Quién resolvió. |
| `verificado_el` | `timestamptz` | Cuándo. |

## Fase 1 — implementada

### `dojos`
| Columna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` PK | |
| `nombre` | `text` | 2–120 caracteres. |
| `slug` | `text` UNIQUE | `^[a-z0-9]+(-[a-z0-9]+)*$`. |
| `estado_licencia` | `estado_licencia` | `activa`, `prueba`, `suspendida`, `vencida`. |
| `licencia_vence_el` | `date` | |
| `activo` | `boolean` | |

**RLS:** lectura para el superadmin y para quien pertenece al dojo. Escritura solo superadmin.

### `usuarios`
| Columna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` PK → `auth.users` | Mismo id que Auth. |
| `dojo_id` | `uuid` → `dojos` | `NULL` **solo** si `rol = 'superadmin'` (CHECK). |
| `rol` | `rol_usuario` | `superadmin`, `maestro`, `sensei`, `representante`, `alumno`. |
| `nombre`, `apellido`, `email`, `telefono`, `activo` | | `email` único (case-insensitive). |

**RLS:** cada quien ve su propia fila; los roles de dojo ven su dojo; el superadmin ve todo.
El maestro crea y edita `sensei` / `representante` / `alumno` de su dojo. El trigger
`app.proteger_campos_criticos()` impide cambiar `rol` o `dojo_id` sin autorización.

**Helpers de RLS** (`SECURITY DEFINER`, esquema `app`): `rol_actual()`, `dojo_actual()`,
`es_superadmin()`, `es_maestro()`.

## Fase 2 — alumnos y clases (implementada)

- **`alumnos`** — `dojo_id`, `usuario_id` (→ `usuarios`, nullable: un alumno pequeño puede
  no tener cuenta propia), `nombre`, `apellido`, `fecha_nacimiento`, `fecha_ingreso`,
  `activo`, `notas`. (`cinturon_actual_id` lo añade la Fase 5, junto con la tabla a la que
  apunta.)
- **`representante_alumno`** — `dojo_id`, `representante_id`, `alumno_id`, `parentesco`.
  PK compuesta: un representante puede tener varios alumnos y viceversa.
- **`clases`** — `dojo_id`, `nombre`, `sensei_id` (→ `usuarios`), `nivel`, `capacidad`, `activa`.
- **`horarios`** — `dojo_id`, `clase_id`, `dia_semana` (0–6), `hora_inicio`, `hora_fin`.
  Es la tabla contra la que se valida el escaneo del QR.
- **`clase_alumno`** — `dojo_id`, `clase_id`, `alumno_id`, `fecha_inscripcion`.

**RLS:** todo acotado a `dojo_actual()`. El sensei solo escribe sobre clases donde
`sensei_id = auth.uid()`; el representante y el alumno solo leen sus propias filas.
Helpers: `app.es_staff()`, `app.es_representante_de(uuid)`, `app.alumno_propio()`,
`app.imparte_clase(uuid)`.

Además, el trigger `app.validar_coherencia_dojo()` impide enlazar filas de dojos distintos
(un alumno de un dojo con una clase de otro), que sería una fuga de aislamiento por la
puerta de atrás que las políticas por sí solas no cubren.

**El superadmin no tiene políticas sobre estas tablas**: su alcance son licencias, soporte y
métricas agregadas, no los datos operativos de cada dojo.

## Fase 3 — asistencia (implementada)

- **`codigos_qr`** — `dojo_id`, `clase_id` (nullable: QR por dojo o por clase), `token`
  (opaco, **fijo**; la rotación está fuera del MVP), `activo`. Se imprime una sola vez.
- **`asistencias`** — `dojo_id`, `alumno_id`, `clase_id`, `fecha date`, `hora timestamptz`,
  `origen` (`qr` \| `manual`), `registrado_por`, `client_id uuid`.
  - `UNIQUE (alumno_id, clase_id, fecha)` → una asistencia por alumno, clase y día.
  - `UNIQUE (client_id)` → **idempotencia para el modo offline**: la app genera el
    `client_id` al marcar sin conexión y al sincronizar reintenta con `on conflict do nothing`.
  - La validación de que el escaneo cae dentro de un horario activo es **del servidor**
    (función `SECURITY DEFINER` que consulta `horarios`), nunca del cliente.

## Fase 4 — pagos y solvencia (implementada)

- **`planes_pago`** — `dojo_id`, `nombre`, `monto numeric(12,2)`, `moneda`, `periodicidad`
  (`mensual` \| `trimestral` \| `anual`), `activo`.
- **`pagos`** — `dojo_id`, `alumno_id`, `plan_id`, `periodo` (`date`, primer día del mes
  cubierto), `monto`, `subido_por` + las columnas del *flujo de verificación*.
  `UNIQUE (alumno_id, periodo)` sobre los pagos no rechazados.
- **Solvencia:** no es una columna editable a mano, es una **vista** (`vista_solvencia`)
  derivada del último pago aprobado y la periodicidad del plan. Así no puede quedar
  desincronizada.

## Fase 5 — grados y cinturones (implementada)

- **`cinturones`** — `dojo_id`, `nombre`, `color`, `orden` (int, ascendente). `UNIQUE (dojo_id, orden)`.
- **`requisitos_grado`** — `dojo_id`, `cinturon_id`, `asistencias_minimas`,
  `meses_minimos_en_grado_anterior`, `requiere_solvencia boolean`.
- **`examenes`** — `dojo_id`, `alumno_id`, `cinturon_destino_id`, `fecha`, `resultado`
  (`aprobado` \| `reprobado`), `evaluador_id`, `observaciones`.
- **`certificados`** — `dojo_id`, `examen_id`, `archivo_url`, `emitido_el`.
  Se genera al aprobar el examen y actualizar `alumnos.cinturon_actual_id`.

## Fase 6 — eventos (implementada)

- **`eventos`** — `dojo_id`, `nombre`, `tipo` (`torneo` \| `seminario` \| `examen_especial`),
  `fecha`, `cupo int`, `costo numeric(12,2)` (0 = gratuito), `activo`.
- **`inscripciones`** — `dojo_id`, `evento_id`, `alumno_id`, `inscrito_por` + las columnas del
  *flujo de verificación* (solo si el evento tiene costo). `UNIQUE (evento_id, alumno_id)`.
  El control de cupo se hace en el servidor, no contando filas en el cliente.

## Fase 7 — plataforma (superadmin) (implementada)

- **`suscripciones`** — `dojo_id`, `periodo`, `monto` + columnas del *flujo de verificación*.
  Es el pago **del dojo a la plataforma**; al aprobarse se actualiza `dojos.estado_licencia`
  y `dojos.licencia_vence_el`.
- **`tickets_soporte`** — `dojo_id`, `abierto_por`, `asunto`, `descripcion`, `estado`
  (`abierto` \| `en_proceso` \| `cerrado`), `respuesta`, `cerrado_el`.
  Única tabla con `dojo_id` que el superadmin lee de forma transversal.
- **Métricas globales:** vistas agregadas, solo accesibles al superadmin.

## Fase 8 — notificaciones (implementada)

- **`notificaciones`** — `dojo_id`, `usuario_id`, `tipo`, `titulo`, `cuerpo`, `leida`,
  `datos jsonb`, `enviada_el`.
- **`dispositivos`** — `usuario_id`, `push_token`, `plataforma`. Un usuario, varios dispositivos.
