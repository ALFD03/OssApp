# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Current state

**Fases 0 a 8 completas; la 9 preparada** (falta lo que exige cuentas de tienda, ver
`docs/publicacion.md`). Dos apps Expo, tres paquetes compartidos, esquema con RLS, temas
claro/oscuro, y los flujos completos de asistencia QR, pagos, grados, eventos, plataforma y
notificaciones.

Comandos (desde la raíz):

```bash
npm install                      # npm workspaces
npm run typecheck                # tsc en los 5 workspaces
npm run lint                     # ESLint
npm test                         # Vitest (packages/core)
npm run db:start                 # Supabase local en Docker
npm run db:reset                 # migraciones + seed
npm run db:test                  # suite de aislamiento RLS (psql)
npm run db:types                 # regenera packages/data/src/types/database.ts
npm run staff / npm run familias # arranca cada app
npm run telefono:staff           # app en un telefono Android por USB (adb reverse)
```

Antes de dar por terminado un cambio: `typecheck`, `lint`, `test` y, si tocaste SQL,
`db:reset && db:test`.

Working language: the spec and domain vocabulary are in Spanish (dojo, maestro, sensei,
representante, alumno, solvencia, grado/cinturón). Keep domain terms in Spanish in code
identifiers and DB schema so they match the spec.

## Estructura real

```
apps/staff, apps/familias   Expo + expo-router. Rutas finas: (auth)/login y (app)/*
packages/core               Dominio puro: roles, permisos (puede()), pestañas, tipos
packages/data               Cliente Supabase, auth, AuthProvider, consultas
packages/ui                 paleta.ts + temas.ts (claro/oscuro), TemaProvider, componentes
                            y pantallas compartidas (login, perfil, tabs)
supabase/migrations         0001/0002 F1 (base + RLS), 0003/0004 F2 (alumnos, clases),
                            0005/0006 F3 (asistencia QR), 0007/0008 F4 (pagos),
                            0009/0010 F5 (grados), 0011/0012 F6 (eventos),
                            0013/0014 F7 (plataforma), 0015 F8 (notificaciones)
supabase/tests              aislamiento.sql — 115 aserciones de multi-tenancy
docs/data-model.md          Esquema completo de las fases 1–7
docs/convenciones.md        Dónde va cada cosa, ramas, commits
docs/publicacion.md         Fase 9: qué falta para publicar y qué depende de ti
```

Puntos de entrada útiles: `packages/core/src/permisos.ts` es la única fuente de verdad de
qué puede hacer cada rol (la navegación de ambas apps deriva de ahí);
`supabase/migrations/0002_rls.sql` y `0004_alumnos_clases_rls.sql` son la frontera de seguridad.

**Marca:** el logotipo es `assets/logo.png` y se usa **tal cual** vía `LogoOssApp`. No se
reconstruye ni se sustituye por una versión dibujada. La tipografía es Cascadia Code en
todos los pesos (`packages/ui/src/tipografia.ts`); ninguna pantalla declara `fontFamily` a
mano.

**Navegación:** máximo 5 pestañas por rol. Lo que no cabe va a la pantalla "Más"
(`destinosSecundarios(rol)` en `packages/core/src/navegacion.ts`), nunca se elimina.

**Lógica de servidor:** lo que no debe decidir el cliente vive en funciones
`SECURITY DEFINER`: validación del escaneo QR (`registrar_asistencia_qr`), sello de quién
verificó un pago (`sellar_verificacion`), subida de cinturón y emisión de certificado al
aprobar un examen (`aplicar_examen_aprobado`), cálculo de elegibilidad
(`progreso_de_grado`), control de cupo de eventos (`validar_cupo_evento`), renovación de
licencia al aprobar la suscripción (`aplicar_suscripcion_aprobada`) y creación de
notificaciones (`app.notificar`). La solvencia es una **vista derivada**, no una columna
editable.

**Offline:** el marcado manual se encola en `colaAsistencia.ts` cuando falla la escritura y
se reenvía con un `client_id` generado en el dispositivo. Toda escritura pensada para
offline debe ser idempotente por ese camino.

**Color:** ninguna pantalla declara un color literal. Se consumen los tokens semánticos de
`useTema()` (`tema.color.primario`, `tema.color.texto`…), que cambian solos entre claro y
oscuro. `paleta.ts` es la rampa de marca cruda y no se usa directamente en pantallas.

## Planned architecture

**Monorepo with two independent mobile apps plus shared packages:**

- **OssApp Staff** — superadmin, maestro (dojo owner/admin), sensei.
- **OssApp Familias** — representante (parent/guardian), alumno (student).

Shared business logic, data access, and types live in shared packages consumed by both apps. A change to a domain rule (solvency, attendance validation, grade requirements) should land in a shared package, not duplicated per app.

**Backend:** Supabase (Postgres + Auth + Storage), serverless, no payment gateway. Payments are 100% manual: users upload a receipt image/PDF to Storage, a record is created as "pendiente de verificación", and a maestro/sensei approves or rejects it in the Staff app.

## Cross-cutting invariants

These constrain nearly every feature and are easy to violate:

1. **Multi-tenancy by `dojo_id`.** Every tenant-scoped table carries `dojo_id` and is isolated by Postgres Row Level Security policies. No cross-dojo reads or writes. Superadmin is the only role that sees across dojos, and only for licensing/support/metrics. Never rely on client-side filtering for isolation — the RLS policy is the boundary.
2. **Role-driven navigation.** Five roles across two apps; each app's navigation and permitted actions derive from the authenticated user's role. Sensei has a strict subset of maestro's capabilities (attendance for their own classes, exam records, reports for their groups).
3. **Manual verification flows.** Both student payments and dojo subscription payments follow the same shape: upload receipt → pending → human approve/reject with reason → status update → notification. Reuse one flow rather than building two.
4. **Offline support** is required for manual attendance marking in the Staff app (dojos with unstable connectivity), with later sync. Design attendance writes to be queueable and idempotent.
5. **QR is fixed, not rotating.** One printed QR per dojo (or per class/schedule). Attendance validation is server-side: the scan must match an active class at that time slot. Token rotation and geolocation are explicitly out of MVP scope.

## Domain flows

- **Asistencia:** student/representante scans the printed QR in the Familias app → server validates active class for that time → attendance recorded. Sensei can mark attendance manually in Staff as backup. Reports by class, day, or date range.
- **Pagos y solvencia:** receipt upload → pending → maestro verifies → student's solvency status updates automatically → notification + payment history.
- **Grados:** maestro defines per-belt requirements (minimum attendance, minimum time at previous grade) → exam recorded with result → on pass, current belt updates and a downloadable certificate is generated → progress and history visible in Familias.
- **Eventos:** maestro creates event (date, capacity, optional cost) → enrollment from Familias with receipt if paid → capacity managed in Staff.
- **Licencias (superadmin):** dojo list with license state (activa, en prueba, suspendida, vencida) → manual subscription payment verification → activate/suspend/renew → support ticket inbox → global metrics.

## Build order

The spec defines phases 0–9 and later phases assume earlier tables and RLS policies exist. Build in order: auth + multi-tenancy (1) → alumnos/clases (2) → asistencia QR (3) → pagos (4) → grados (5) → eventos (6) → superadmin/licencias (7) → notificaciones + offline polish (8) → publicación (9). See `OssApp_Especificaciones.md` §7 for the deliverables of each phase.

Out of MVP scope (do not build unless asked): payment gateways, QR token rotation/geolocation, advanced analytics, internal chat, multi-language.
