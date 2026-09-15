import type { Rol } from './roles';

/**
 * Definicion de las pestanas de cada rol. Vive en core para que Staff y Familias
 * no reimplementen la navegacion por rol cada una por su lado.
 * `icono` es un nombre de Ionicons (@expo/vector-icons).
 */
export type Pestana = {
  /** Nombre de la ruta dentro del grupo (app) de expo-router. */
  ruta: string;
  titulo: string;
  icono: string;
};

export type Destino = Pestana & { descripcion: string };

/**
 * Maximo cinco pestanas: mas no caben de forma legible en un movil. Lo que no
 * entra va a la pantalla "Mas", no se elimina.
 */
const PESTANAS: Record<Rol, readonly Pestana[]> = {
  superadmin: [
    { ruta: 'index', titulo: 'Dojos', icono: 'business-outline' },
    { ruta: 'metricas', titulo: 'Metricas', icono: 'stats-chart-outline' },
    { ruta: 'soporte', titulo: 'Soporte', icono: 'help-buoy-outline' },
    { ruta: 'mas', titulo: 'Mas', icono: 'ellipsis-horizontal-outline' },
  ],
  maestro: [
    { ruta: 'index', titulo: 'Inicio', icono: 'home-outline' },
    { ruta: 'alumnos', titulo: 'Alumnos', icono: 'people-outline' },
    { ruta: 'clases', titulo: 'Clases', icono: 'calendar-outline' },
    { ruta: 'pagos', titulo: 'Pagos', icono: 'card-outline' },
    { ruta: 'mas', titulo: 'Mas', icono: 'ellipsis-horizontal-outline' },
  ],
  sensei: [
    { ruta: 'index', titulo: 'Inicio', icono: 'home-outline' },
    { ruta: 'clases', titulo: 'Mis clases', icono: 'calendar-outline' },
    { ruta: 'asistencia', titulo: 'Asistencia', icono: 'checkmark-done-outline' },
    { ruta: 'mas', titulo: 'Mas', icono: 'ellipsis-horizontal-outline' },
  ],
  representante: [
    { ruta: 'index', titulo: 'Inicio', icono: 'home-outline' },
    { ruta: 'asistencia', titulo: 'Asistencia', icono: 'qr-code-outline' },
    { ruta: 'pagos', titulo: 'Pagos', icono: 'card-outline' },
    { ruta: 'progreso', titulo: 'Progreso', icono: 'ribbon-outline' },
    { ruta: 'mas', titulo: 'Mas', icono: 'ellipsis-horizontal-outline' },
  ],
  alumno: [
    { ruta: 'index', titulo: 'Inicio', icono: 'home-outline' },
    { ruta: 'asistencia', titulo: 'Asistencia', icono: 'qr-code-outline' },
    { ruta: 'progreso', titulo: 'Progreso', icono: 'ribbon-outline' },
    { ruta: 'mas', titulo: 'Mas', icono: 'ellipsis-horizontal-outline' },
  ],
};

/** Destinos de la pantalla "Mas": lo que no cabe en la barra de pestanas. */
const SECUNDARIOS: Record<Rol, readonly Destino[]> = {
  superadmin: [
    {
      ruta: 'notificaciones',
      titulo: 'Notificaciones',
      icono: 'notifications-outline',
      descripcion: 'Avisos de pagos, examenes y eventos',
    },
    {
      ruta: 'perfil',
      titulo: 'Mi perfil',
      icono: 'person-circle-outline',
      descripcion: 'Datos de la cuenta y apariencia',
    },
  ],
  maestro: [
    {
      ruta: 'asistencia',
      titulo: 'Asistencia',
      icono: 'checkmark-done-outline',
      descripcion: 'QR del dojo, pase de lista y reportes',
    },
    {
      ruta: 'grados',
      titulo: 'Grados',
      icono: 'ribbon-outline',
      descripcion: 'Examenes, requisitos por cinturon y certificados',
    },
    {
      ruta: 'eventos',
      titulo: 'Eventos',
      icono: 'calendar-number-outline',
      descripcion: 'Torneos y seminarios, inscripciones y cupo',
    },
    {
      ruta: 'soporte',
      titulo: 'Soporte y licencia',
      icono: 'help-buoy-outline',
      descripcion: 'Suscripcion del dojo y tickets a la plataforma',
    },
    {
      ruta: 'notificaciones',
      titulo: 'Notificaciones',
      icono: 'notifications-outline',
      descripcion: 'Avisos de pagos, examenes y eventos',
    },
    {
      ruta: 'perfil',
      titulo: 'Mi perfil',
      icono: 'person-circle-outline',
      descripcion: 'Datos de la cuenta y apariencia',
    },
  ],
  sensei: [
    {
      ruta: 'grados',
      titulo: 'Grados',
      icono: 'ribbon-outline',
      descripcion: 'Registrar examenes de tus grupos',
    },
    {
      ruta: 'notificaciones',
      titulo: 'Notificaciones',
      icono: 'notifications-outline',
      descripcion: 'Avisos de pagos, examenes y eventos',
    },
    {
      ruta: 'perfil',
      titulo: 'Mi perfil',
      icono: 'person-circle-outline',
      descripcion: 'Datos de la cuenta y apariencia',
    },
  ],
  representante: [
    {
      ruta: 'alumnos',
      titulo: 'Mis alumnos',
      icono: 'people-outline',
      descripcion: 'Fichas, clases y horarios',
    },
    {
      ruta: 'eventos',
      titulo: 'Eventos',
      icono: 'calendar-number-outline',
      descripcion: 'Torneos y seminarios del dojo',
    },
    {
      ruta: 'notificaciones',
      titulo: 'Notificaciones',
      icono: 'notifications-outline',
      descripcion: 'Avisos de pagos, examenes y eventos',
    },
    {
      ruta: 'perfil',
      titulo: 'Mi perfil',
      icono: 'person-circle-outline',
      descripcion: 'Datos de la cuenta y apariencia',
    },
  ],
  alumno: [
    {
      ruta: 'alumnos',
      titulo: 'Mi ficha',
      icono: 'people-outline',
      descripcion: 'Tus datos, clase y horario',
    },
    {
      ruta: 'eventos',
      titulo: 'Eventos',
      icono: 'calendar-number-outline',
      descripcion: 'Torneos y seminarios del dojo',
    },
    {
      ruta: 'notificaciones',
      titulo: 'Notificaciones',
      icono: 'notifications-outline',
      descripcion: 'Avisos de pagos, examenes y eventos',
    },
    {
      ruta: 'perfil',
      titulo: 'Mi perfil',
      icono: 'person-circle-outline',
      descripcion: 'Datos de la cuenta y apariencia',
    },
  ],
};

export function pestanasDe(rol: Rol): readonly Pestana[] {
  return PESTANAS[rol];
}

export function destinosSecundarios(rol: Rol): readonly Destino[] {
  return SECUNDARIOS[rol];
}

/** Todas las rutas que una app debe declarar, sea cual sea el rol conectado. */
export function rutasDeApp(roles: readonly Rol[]): string[] {
  const rutas = new Set<string>();
  for (const rol of roles) {
    for (const pestana of PESTANAS[rol]) rutas.add(pestana.ruta);
    for (const destino of SECUNDARIOS[rol]) rutas.add(destino.ruta);
  }
  return [...rutas];
}
