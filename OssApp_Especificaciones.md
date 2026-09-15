# OssApp — Especificaciones del Sistema

## 1. Descripción general

**OssApp** es una plataforma móvil multi-tenant para la gestión integral de escuelas de artes marciales (dojos). Permite a cada dojo administrar su operación diaria — alumnos, sensei, asistencia, pagos, grados y eventos — desde dos aplicaciones móviles diferenciadas por tipo de usuario, mientras una plataforma central (superadmin) supervisa las licencias, el soporte y la salud general del negocio de cada dojo cliente.

El sistema está compuesto por **dos aplicaciones**:

- **OssApp Staff** — para superadmin, maestros (dueños/administradores de dojo) y sensei.
- **OssApp Familias** — para representantes (padres/tutores) y alumnos.

## 2. Objetivos del sistema

### Objetivo general
Digitalizar y centralizar la administración de escuelas de artes marciales, facilitando el control de asistencia, pagos, progreso de grados y comunicación entre el dojo y las familias, bajo un modelo de plataforma (SaaS) que pueda escalar a múltiples dojos de forma independiente.

### Objetivos específicos

- Permitir que cada dojo gestione su propia información de forma aislada (multi-tenancy), sin acceso cruzado entre dojos.
- Automatizar el registro de asistencia mediante código QR fijo por dojo/clase, con respaldo de marcado manual por el sensei.
- Controlar el estado de solvencia de cada alumno mediante un flujo de pago manual con comprobante y verificación.
- Llevar el historial de grados/cinturones y generar certificados digitales.
- Gestionar eventos del dojo (torneos, seminarios, exámenes especiales) con inscripción y cupo.
- Dar visibilidad en tiempo real a representantes y alumnos sobre su estado de cuenta, asistencia y progreso.
- Ofrecer a la plataforma (superadmin) el control de licencias de cada dojo, verificación de pagos de suscripción y soporte centralizado.

## 3. Roles de usuario

| Rol | App | Descripción |
|---|---|---|
| **Superadmin** | Staff | Administra la plataforma completa: licencias de dojos, verificación de pagos de suscripción, soporte, métricas globales. |
| **Maestro** | Staff | Administrador de un dojo específico: gestiona sensei, alumnos, clases, pagos, grados y eventos de su dojo. |
| **Sensei** | Staff | Gestiona asistencia de sus clases, registra exámenes de grado, ve reportes de sus grupos. |
| **Representante** | Familias | Padre/tutor de uno o más alumnos: ve estado de cuenta, sube comprobantes de pago, ve asistencia y progreso de sus hijos. |
| **Alumno** | Familias | Ve su propio perfil, asistencia, estado de cuenta, progreso de cinturón y eventos disponibles. |

## 4. Uso general del sistema

### 4.1 Flujo de asistencia (QR fijo por dojo/clase)

1. El maestro genera un código QR único por dojo (o por clase/horario) desde OssApp Staff.
2. El QR se imprime una sola vez y se coloca físicamente en la entrada del dojo o del salón correspondiente.
3. Al llegar a clase, el alumno o su representante escanea el QR con OssApp Familias.
4. El sistema valida que el escaneo corresponda a una clase activa en ese horario y registra la asistencia automáticamente.
5. Como respaldo, el sensei puede marcar asistencia manual desde OssApp Staff (para quienes no tengan celular disponible).
6. El sensei visualiza reportes de asistencia por clase, día o rango de fechas.

### 4.2 Flujo de pagos (manual con verificación)

1. El representante o alumno sube una foto o PDF del comprobante de pago desde OssApp Familias.
2. El sistema crea un registro de pago en estado "pendiente de verificación".
3. El maestro o sensei autorizado revisa el comprobante desde OssApp Staff y lo aprueba o rechaza (indicando motivo).
4. Al aprobarse, el estado de solvencia del alumno se actualiza automáticamente.
5. El representante/alumno recibe notificación del resultado y puede ver su historial de pagos y estado de cuenta en todo momento.

### 4.3 Flujo de grados y cinturones

1. El maestro define los requisitos por cinturón (asistencia mínima, tiempo mínimo en el grado anterior, etc.).
2. El sensei o maestro registra la realización de un examen y su resultado.
3. Al aprobar, se actualiza el cinturón actual del alumno y se genera un certificado descargable.
4. El alumno/representante visualiza el progreso hacia el siguiente grado y el historial de exámenes.

### 4.4 Flujo de eventos

1. El maestro crea un evento (torneo, seminario, examen especial) con fecha, cupo y costo opcional.
2. El representante/alumno se inscribe desde OssApp Familias, subiendo comprobante de pago si el evento tiene costo.
3. El maestro/sensei visualiza la lista de inscritos y gestiona el cupo disponible.

### 4.5 Flujo de licencias y soporte (superadmin)

1. El superadmin visualiza el listado completo de dojos registrados en la plataforma, con su estado de licencia (activa, en prueba, suspendida, vencida).
2. Cada dojo realiza el pago de su suscripción a la plataforma de forma manual (comprobante) y el superadmin lo verifica.
3. El superadmin puede activar, suspender o renovar la licencia de un dojo según el estado de pago.
4. El superadmin atiende solicitudes de soporte reportadas por los maestros de cada dojo.
5. El superadmin visualiza métricas globales: número de dojos activos, alumnos totales, ingresos de la plataforma, entre otros.

## 5. Módulos funcionales

- **Autenticación y multi-tenancy** — login por rol, aislamiento de datos por dojo.
- **Gestión de alumnos y clases** — altas, bajas, asignación de sensei y horarios.
- **Asistencia** — registro vía QR fijo y marcado manual, reportes.
- **Contabilidad y pagos** — planes de pago, carga y verificación manual de comprobantes, estado de solvencia, reportes de ingresos.
- **Grados y cinturones** — requisitos, exámenes, resultados, certificados.
- **Eventos** — creación, inscripción, control de cupo.
- **Notificaciones** — recordatorios de pago, resultados de verificación, resultados de examen, nuevos eventos.
- **Panel de superadmin** — licencias, verificación de pagos de suscripción, soporte, métricas globales.

## 6. Consideraciones técnicas generales

- **Arquitectura:** dos aplicaciones móviles independientes (OssApp Staff y OssApp Familias), compartiendo lógica común mediante un monorepo.
- **Multi-tenancy:** aislamiento de datos por dojo mediante `dojo_id` y políticas de seguridad a nivel de base de datos.
- **Infraestructura inicial (pruebas):** backend serverless basado en Supabase (Postgres, Auth, Storage), sin pasarela de pagos integrada — los pagos son 100% manuales con verificación humana.
- **Modo offline:** contemplado para el marcado manual de asistencia en dojos sin conexión estable, con sincronización posterior.
- **Escalabilidad futura:** posibilidad de migrar la base de datos a un proveedor dedicado (ej. Neon, RDS) y de incorporar pasarelas de pago automatizadas en fases posteriores.

## 7. Plan de desarrollo por fases

### Fase 0 — Preparación
- Definición de identidad del proyecto (nombre, logo, paleta).
- Configuración del monorepo (apps Staff y Familias + paquetes compartidos).
- Creación del proyecto en Supabase (entorno de pruebas).
- Diseño del esquema completo de base de datos (tablas, relaciones, políticas de seguridad).
- Configuración de repositorio y convenciones de trabajo.

### Fase 1 — Fundamentos: autenticación y multi-tenancy
- Tablas base de dojos, usuarios y roles.
- Autenticación con roles personalizados y aislamiento de datos por dojo.
- Login funcional en ambas apps con navegación según rol.
- Datos de prueba para validar el aislamiento entre dojos.

### Fase 2 — Gestión de alumnos y clases
- Tablas de alumnos, relación representante-alumno, clases y horarios.
- CRUD de alumnos, asignación a clases y sensei (App Staff).
- Gestión de sensei por parte del maestro.
- Visualización de perfil, clase y horario (App Familias).

### Fase 3 — Asistencia con QR
- Tabla de asistencias y generación de QR fijo por dojo/clase.
- Generación y descarga del QR para impresión (App Staff).
- Escáner QR para marcar asistencia (App Familias).
- Marcado manual de respaldo y reportes de asistencia (App Staff).

### Fase 4 — Pagos manuales y solvencia
- Tablas de planes de pago y pagos, con almacenamiento de comprobantes.
- Carga de comprobantes y visualización de estado de cuenta (App Familias).
- Bandeja de verificación de pagos y dashboard de solvencia (App Staff).
- Reportes de ingresos por período.

### Fase 5 — Grados y cinturones
- Catálogo de cinturones, exámenes y resultados.
- Registro de exámenes y definición de requisitos por grado (App Staff).
- Generación de certificados digitales.
- Visualización de progreso e historial (App Familias).

### Fase 6 — Eventos
- Tablas de eventos e inscripciones.
- Creación y gestión de eventos, control de cupo (App Staff).
- Inscripción y carga de comprobante de pago si aplica (App Familias).

### Fase 7 — Panel de superadmin y licencias
- Tablas de suscripciones y tickets de soporte.
- Listado de dojos con estado de licencia y control de activación/suspensión.
- Verificación de pagos de suscripción de cada dojo.
- Métricas globales de la plataforma y bandeja de soporte.

### Fase 8 — Notificaciones y pulido
- Notificaciones push para pagos, asistencia, exámenes y eventos.
- Mejoras de modo offline para asistencia manual.
- Revisión de flujos completos y pruebas con un dojo piloto.

### Fase 9 — Publicación
- Preparación de cuentas de desarrollador (Google Play, Apple Developer).
- Generación de builds de producción.
- Publicación de ambas aplicaciones en las tiendas correspondientes.
- Evaluación de migración de infraestructura de pruebas a producción.

## 8. Alcance fuera del MVP (posibles fases futuras)

- Integración de pasarelas de pago automatizadas (Stripe, Mercado Pago, etc.).
- Rotación periódica del token del QR y validación por geolocalización.
- Reportes avanzados y analítica por dojo.
- Chat interno entre maestro/sensei y representantes.
- Soporte multi-idioma.
