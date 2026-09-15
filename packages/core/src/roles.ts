/**
 * Roles del sistema. Coinciden exactamente con el enum `rol_usuario` de Postgres
 * (supabase/migrations/0001_base.sql); si cambia uno, debe cambiar el otro.
 */
export const ROLES = ['superadmin', 'maestro', 'sensei', 'representante', 'alumno'] as const;

export type Rol = (typeof ROLES)[number];

export const ESTADOS_LICENCIA = ['activa', 'prueba', 'suspendida', 'vencida'] as const;
export type EstadoLicencia = (typeof ESTADOS_LICENCIA)[number];

/** Que app corresponde a cada rol. Un rol pertenece a una sola app. */
export const APP_POR_ROL: Record<Rol, 'staff' | 'familias'> = {
  superadmin: 'staff',
  maestro: 'staff',
  sensei: 'staff',
  representante: 'familias',
  alumno: 'familias',
};

export const ETIQUETA_ROL: Record<Rol, string> = {
  superadmin: 'Superadmin',
  maestro: 'Maestro',
  sensei: 'Sensei',
  representante: 'Representante',
  alumno: 'Alumno',
};

export const ETIQUETA_ESTADO_LICENCIA: Record<EstadoLicencia, string> = {
  activa: 'Activa',
  prueba: 'En prueba',
  suspendida: 'Suspendida',
  vencida: 'Vencida',
};

export function esRol(valor: unknown): valor is Rol {
  return typeof valor === 'string' && (ROLES as readonly string[]).includes(valor);
}

/** Los roles cuyos datos estan acotados a un dojo. El superadmin es el unico que no lo esta. */
export function requiereDojo(rol: Rol): boolean {
  return rol !== 'superadmin';
}
