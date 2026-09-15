# OssApp

Plataforma móvil multi-tenant para la gestión de escuelas de artes marciales (dojos):
alumnos, asistencia, pagos, grados y eventos, con una plataforma central que administra
las licencias de cada dojo cliente.

Dos aplicaciones sobre un backend Supabase compartido:

- **OssApp Staff** (`apps/staff`) — superadmin, maestro y sensei.
- **OssApp Familias** (`apps/familias`) — representante y alumno.

Las especificaciones completas están en [`OssApp_Especificaciones.md`](OssApp_Especificaciones.md).

## Estado

**Fases 0 a 8 completas; la 9 preparada.**

- **Fase 0** — monorepo, identidad visual (logo, paleta, Cascadia Code, temas claro y
  oscuro), esquema completo diseñado, convenciones.
- **Fase 1** — aislamiento multi-tenant por RLS, login y navegación por rol.
- **Fase 2** — alumnos, clases, horarios y relación representante–alumno.
- **Fase 3** — asistencia con QR fijo, validación de horario en el servidor y marcado
  manual de respaldo.
- **Fase 4** — pagos manuales con comprobante, bandeja de verificación y solvencia.
- **Fase 5** — cinturones, requisitos por grado, exámenes y certificados.
- **Fase 6** — eventos con cupo controlado en servidor e inscripciones con comprobante.
- **Fase 7** — panel de superadmin: licencias, verificación de suscripciones, soporte y
  métricas globales.
- **Fase 8** — notificaciones generadas por el servidor, registro de push y cola offline
  para el marcado manual de asistencia.
- **Fase 9** — `eas.json`, permisos y metadatos de tienda listos. Lo que falta requiere tus
  cuentas de desarrollador y el isotipo para los iconos: ver [`docs/publicacion.md`](docs/publicacion.md).

## Requisitos

- Node.js ≥ 20 y npm
- Docker (para el stack local de Supabase)
- `psql` (para la suite de aislamiento)

## Puesta en marcha

```bash
npm install
cp .env.example .env
cp .env.example apps/staff/.env
cp .env.example apps/familias/.env

npm run db:start      # levanta Postgres, Auth y Storage en Docker
npm run db:reset      # aplica migraciones + datos de prueba
```

Luego, cada app en su propia terminal:

```bash
npm run staff         # OssApp Staff
npm run familias      # OssApp Familias
```

Se abren con Expo Go, un emulador o `w` para navegador.

## Probar en un teléfono Android por USB

Método recomendado: **no requiere que el teléfono y el PC estén en la misma red**, así que
funciona en redes de trabajo o WiFi de invitados donde los dispositivos están aislados entre
sí. Tampoco hace falta Android Studio ni el SDK de Android: todos los módulos nativos que usa
el proyecto vienen incluidos en Expo Go.

**Una sola vez:**

1. En el PC: `sudo pacman -S android-tools android-udev`
   (`android-udev` evita el típico `no permissions` al conectar el cable).
2. En el teléfono: instala **Expo Go** desde Play Store.
3. En el teléfono: activa **Opciones de desarrollador** (Ajustes → Información del teléfono →
   pulsa 7 veces en "Número de compilación") y dentro de ellas, **Depuración por USB**.

**Cada vez:**

```bash
npm run db:start          # terminal 1: Supabase local
npm run telefono:staff    # terminal 2 (o telefono:familias)
```

Conecta el cable, acepta el diálogo *"¿Permitir depuración USB?"* que aparece en el teléfono,
y abre el QR con Expo Go.

El script usa `adb reverse` para que el teléfono reenvíe su propio `localhost:8081` (Metro) y
`localhost:54321` (Supabase) al PC a través del cable. Por eso el `.env` se queda con
`127.0.0.1` y no hay que tocar ninguna IP. Ojo: los reenvíos se pierden al desconectar el
cable, así que vuelve a lanzar el script.

Si en algún momento el proyecto necesita un módulo nativo que Expo Go no incluya, habrá que
pasar a una *development build* (`npx expo run:android`), que sí exige JDK 17 y el SDK de
Android. Hoy no hace falta.

## Cuentas de prueba

Contraseña de todas: `ossapp123`

| Correo | Rol | Dojo | App |
|---|---|---|---|
| `super@ossapp.test` | superadmin | — | Staff |
| `maestro@sakura.test` | maestro | Dojo Sakura | Staff |
| `sensei@sakura.test` | sensei | Dojo Sakura | Staff |
| `representante@sakura.test` | representante | Dojo Sakura | Familias |
| `alumno@sakura.test` | alumno | Dojo Sakura | Familias |
| `maestro@tigre.test` | maestro | Dojo Tigre | Staff |
| `sensei@tigre.test` | sensei | Dojo Tigre | Staff |
| `representante@tigre.test` | representante | Dojo Tigre | Familias |
| `alumno@tigre.test` | alumno | Dojo Tigre | Familias |

Los dos dojos existen precisamente para poder comprobar el aislamiento: entra como
`maestro@sakura.test` y no verás ni un dato del Dojo Tigre. Cada app rechaza en el login a
los roles de la otra.

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run typecheck` | TypeScript en los 5 workspaces |
| `npm run lint` | ESLint |
| `npm test` | Tests unitarios (Vitest) |
| `npm run db:start` / `db:stop` | Stack local de Supabase |
| `npm run db:reset` | Migraciones + seed desde cero |
| `npm run db:test` | **Suite de aislamiento multi-tenant** (requiere la BD levantada) |
| `npm run db:types` | Regenera los tipos de TypeScript desde el esquema |
| `npm run telefono:staff` / `telefono:familias` | Arranca la app en un teléfono Android por USB |

## Estructura

```
apps/staff, apps/familias   Las dos apps Expo (expo-router)
packages/core               Tipos de dominio, permisos por rol, navegación
packages/data               Cliente Supabase, auth, consultas
packages/ui                 Tokens de diseño, componentes y pantallas compartidas
supabase/migrations         Esquema y políticas RLS versionadas
supabase/tests              Suite de aislamiento
docs/                       Modelo de datos completo y convenciones
```

## Cómo funciona la asistencia

El QR es **fijo**: se imprime una vez y no caduca. Por eso el token no autoriza nada por sí
solo — la función `registrar_asistencia_qr` comprueba en el servidor que el código pertenezca
al dojo del alumno, que haya una clase en horario (con 30 minutos de margen antes del
inicio), que el alumno esté inscrito en esa clase y que quien escanea sea el propio alumno o
su representante. Escanear dos veces no duplica ni falla: devuelve la marca existente.

El sensei puede pasar lista a mano desde Staff como respaldo. Las escrituras llevan un
`client_id` generado por la app antes de enviar, para que un reintento tras un corte de red
no cree una segunda marca.

## Modo offline

El marcado manual de asistencia funciona sin conexión. Si la escritura falla, la marca se
guarda en una cola local (`packages/data/src/colaAsistencia.ts`) y se reenvía al recuperar la
red, automáticamente al abrir la pantalla o con el botón "Sincronizar ahora". Cada marca
lleva un `client_id` generado en el dispositivo, así que reenviarla nunca duplica: el
servidor deduplica por ese identificador y por (alumno, clase, fecha).

## Nota sobre seguridad

El aislamiento entre dojos lo aplican **las políticas RLS de Postgres**, no el cliente.
Las consultas de `packages/data` se escriben sin filtro de `dojo_id` a propósito: si una
política está mal, la suite de `npm run db:test` lo detecta. Toda tabla nueva llega con sus
políticas en la misma migración.

## Producción

```bash
npx supabase login
npx supabase link --project-ref <ref>
npx supabase db push
```

Después, sustituye `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_ANON_KEY` por los del
proyecto en la nube. La `service_role key` nunca va en una variable `EXPO_PUBLIC_*`: viaja
dentro del bundle de la app.
