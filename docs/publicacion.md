# Fase 9 — Publicación

Estado: **la configuración está lista; los pasos que requieren tus cuentas no los puedo
hacer yo.** Este documento es la lista exacta de lo que falta.

## Lo que ya está hecho

- `eas.json` en cada app con tres perfiles: `development` (dev client), `preview` (APK
  interno para probar) y `production` (AAB para Play Store, con `autoIncrement`).
- `app.json` con `bundleIdentifier` / `package` (`com.ossapp.staff`, `com.ossapp.familias`),
  `versionCode` / `buildNumber`, `runtimeVersion` ligado a la versión, y los textos de
  permiso de cámara y fotos **en español** — iOS rechaza la revisión si faltan.
- Permisos Android declarados: `CAMERA`, `READ_EXTERNAL_STORAGE`, `POST_NOTIFICATIONS`.

## Lo que falta y solo puedes hacer tú

### 1. Iconos
Hace falta el **isotipo suelto** (torii y disco, sin el texto, fondo transparente) en:

| Archivo | Tamaño | Para qué |
|---|---|---|
| `assets/icon.png` | 1024×1024 | Icono de iOS |
| `assets/adaptive-icon.png` | 1024×1024, con margen de seguridad | Icono adaptativo de Android |
| `assets/splash.png` | 1284×2778 o similar | Pantalla de carga |
| `assets/notification-icon.png` | 96×96, monocromo blanco sobre transparente | Barra de estado Android |

El logo actual (`assets/logo.png`) es el lockup completo con fondo claro: sirve para la
pantalla de login, no para el icono. Una vez tengas esos archivos, se referencian en el
`app.json` de cada app (`icon`, `android.adaptiveIcon.foregroundImage`, `splash.image`).

### 2. Cuentas de desarrollador
- **Google Play Console** — 25 USD, pago único.
- **Apple Developer Program** — 99 USD al año.

### 3. Backend de producción
```bash
npx supabase login
npx supabase link --project-ref <ref-del-proyecto>
npx supabase db push          # aplica las 15 migraciones
```
Después, cargar el `.env` de cada app con la URL y la anon key del proyecto cloud.
La `service_role key` **nunca** va en una variable `EXPO_PUBLIC_*`: viaja en el bundle.

Antes de publicar, ejecutar la suite de aislamiento contra producción:
```bash
SUPABASE_DB_URL='<cadena de conexion de produccion>' npm run db:test
```
Si algo falla ahí, no se publica.

### 4. Builds
```bash
npm install -g eas-cli
eas login

cd apps/staff     && eas build --platform android --profile preview      # APK de prueba
cd apps/familias  && eas build --platform android --profile preview

# Producción
eas build --platform all --profile production
eas submit --platform android
eas submit --platform ios
```

### 5. Notificaciones push en producción
- **Android:** subir el JSON de credenciales de Firebase (FCM v1) con `eas credentials`.
- **iOS:** EAS genera la clave APNs sola si le das acceso a la cuenta de Apple.
- Falta el **emisor**: hoy las notificaciones se crean en la base de datos y se leen dentro
  de la app. Para que lleguen al teléfono hace falta una Edge Function que lea
  `notificaciones` sin enviar y las empuje a la API de Expo Push usando los tokens de
  `dispositivos`. El esquema ya está listo para eso.

### 6. Ficha de tienda
Por cada app: descripción, capturas (mínimo 2 por tamaño de pantalla), icono 512×512,
gráfico destacado 1024×500 (Android), política de privacidad publicada en una URL.

La política de privacidad es obligatoria en ambas tiendas y debe mencionar que se recogen
nombre, correo, teléfono, asistencia y comprobantes de pago, y que los datos de cada dojo
están aislados del resto.

## Dojo piloto (Fase 8 del spec)

Antes de publicar conviene un dojo real usando `preview` durante unas semanas. Lo que hay
que vigilar:

- que el QR impreso se lea bien con la cámara de teléfonos antiguos y con poca luz;
- que el margen de 30 minutos antes de la clase encaje con cómo llega la gente;
- que la cola offline se vacíe sola al recuperar la red;
- que los maestros entiendan el flujo de verificación de pagos sin explicación previa.
