import type { Rol } from './roles';

/**
 * Catalogo unico de acciones del sistema. La navegacion de ambas apps y el
 * habilitado/ocultado de botones derivan de aqui: no se duplica logica de rol por app.
 */
export const ACCIONES = [
  // Plataforma (superadmin)
  'plataforma.dojos.ver',
  'plataforma.dojos.administrar',
  'plataforma.suscripciones.verificar',
  'plataforma.metricas.ver',
  'plataforma.soporte.atender',

  // Dojo
  'dojo.ajustes.editar',
  'dojo.soporte.crear',

  // Personal
  'sensei.gestionar',

  // Alumnos y clases
  'alumnos.ver',
  'alumnos.gestionar',
  'clases.ver',
  'clases.gestionar',
  'clases.propias.ver',

  // Asistencia
  'asistencia.marcar.manual',
  'asistencia.escanear.qr',
  'asistencia.qr.generar',
  'asistencia.reportes.ver',
  'asistencia.propia.ver',

  // Pagos
  'pagos.comprobante.subir',
  'pagos.verificar',
  'pagos.reportes.ver',
  'pagos.propios.ver',

  // Grados
  'grados.requisitos.definir',
  'grados.examen.registrar',
  'grados.progreso.propio.ver',

  // Eventos
  'eventos.gestionar',
  'eventos.inscribirse',
  'eventos.ver',
] as const;

export type Accion = (typeof ACCIONES)[number];

/**
 * El sensei es un subconjunto estricto del maestro (regla del spec seccion 3):
 * asistencia de sus propias clases, examenes y reportes de sus grupos.
 */
const PERMISOS: Record<Rol, readonly Accion[]> = {
  superadmin: [
    'plataforma.dojos.ver',
    'plataforma.dojos.administrar',
    'plataforma.suscripciones.verificar',
    'plataforma.metricas.ver',
    'plataforma.soporte.atender',
  ],
  maestro: [
    'dojo.ajustes.editar',
    'dojo.soporte.crear',
    'sensei.gestionar',
    'alumnos.ver',
    'alumnos.gestionar',
    'clases.ver',
    'clases.gestionar',
    'clases.propias.ver',
    'asistencia.marcar.manual',
    'asistencia.qr.generar',
    'asistencia.reportes.ver',
    'pagos.verificar',
    'pagos.reportes.ver',
    'grados.requisitos.definir',
    'grados.examen.registrar',
    'eventos.gestionar',
    'eventos.ver',
  ],
  sensei: [
    'alumnos.ver',
    'clases.propias.ver',
    'asistencia.marcar.manual',
    'asistencia.reportes.ver',
    'grados.examen.registrar',
    'eventos.ver',
  ],
  representante: [
    'alumnos.ver',
    'asistencia.escanear.qr',
    'asistencia.propia.ver',
    'pagos.comprobante.subir',
    'pagos.propios.ver',
    'grados.progreso.propio.ver',
    'eventos.inscribirse',
    'eventos.ver',
  ],
  alumno: [
    'asistencia.escanear.qr',
    'asistencia.propia.ver',
    'pagos.propios.ver',
    'grados.progreso.propio.ver',
    'eventos.inscribirse',
    'eventos.ver',
  ],
};

export function puede(rol: Rol, accion: Accion): boolean {
  return PERMISOS[rol].includes(accion);
}

export function accionesDe(rol: Rol): readonly Accion[] {
  return PERMISOS[rol];
}
