# Convenciones de trabajo

## Dónde va cada cosa

| Si el cambio es… | va en… |
|---|---|
| Una regla de dominio (solvencia, requisitos de grado, permisos por rol) | `packages/core` |
| Acceso a datos, auth, consultas a Supabase | `packages/data` |
| Tokens visuales, componentes y pantallas compartidas | `packages/ui` |
| Una pantalla o navegación específica de una app | `apps/staff` o `apps/familias` |
| Esquema o políticas de base de datos | `supabase/migrations` |

**Regla que no se negocia:** una regla de dominio se implementa **una vez** en un paquete
compartido. Si aparece duplicada en las dos apps, es un bug.

Los identificadores y el esquema van en **español** (dojo, maestro, sensei, alumno,
solvencia, grado), igual que el spec.

## Base de datos

- Nunca se edita una migración ya aplicada; se añade una nueva con el número siguiente
  (`0003_...`, `0004_...`).
- Toda tabla nueva acotada a un dojo nace con `dojo_id`, índice y políticas RLS **en la
  misma migración**. Una tabla sin RLS es una fuga de datos.
- Tras cambiar el esquema: `npm run db:types` para regenerar los tipos de TypeScript.
- Tras tocar políticas: ampliar `supabase/tests/aislamiento.sql` con el caso nuevo.

## Ramas y commits

- `main` es la rama estable; `develop` es la de integración. El trabajo sale de `develop`
  en ramas `feat/...`, `fix/...`, `chore/...`.
- Conventional Commits: `feat(pagos): ...`, `fix(rls): ...`, `docs: ...`, `chore(deps): ...`.
- El alcance suele ser el módulo: `auth`, `alumnos`, `asistencia`, `pagos`, `grados`,
  `eventos`, `plataforma`, `rls`, `ui`.

## Antes de abrir un PR

```bash
npm run typecheck
npm run lint
npm test
npm run db:reset && npm run db:test   # con Supabase local levantado
```

## Fases

El orden del spec (§7) no es negociable: cada fase asume las tablas y políticas de las
anteriores. Fase 0 y 1 están completas. Lo que está fuera del MVP (§8 del spec) no se
construye salvo petición explícita.
