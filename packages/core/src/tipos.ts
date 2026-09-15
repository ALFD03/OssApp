import type { EstadoLicencia, Rol } from './roles';

export type Dojo = {
  id: string;
  nombre: string;
  slug: string;
  estado_licencia: EstadoLicencia;
  licencia_vence_el: string | null;
  activo: boolean;
  creado_el: string;
  actualizado_el: string;
};

export type Usuario = {
  id: string;
  dojo_id: string | null;
  rol: Rol;
  nombre: string;
  apellido: string;
  email: string;
  telefono: string | null;
  activo: boolean;
  creado_el: string;
  actualizado_el: string;
};

/** Perfil del usuario autenticado, con el dojo resuelto cuando aplica. */
export type Perfil = Usuario & {
  dojo: Pick<Dojo, 'id' | 'nombre' | 'slug' | 'estado_licencia'> | null;
};

export function nombreCompleto(usuario: Pick<Usuario, 'nombre' | 'apellido'>): string {
  return `${usuario.nombre} ${usuario.apellido}`.trim();
}

/**
 * Una licencia en `activa` o `prueba` permite operar. `suspendida` y `vencida` no.
 * Se comprueba en cliente para dar un mensaje claro; la frontera real son las
 * politicas RLS y el estado del dojo en base de datos.
 */
export function licenciaPermiteOperar(estado: EstadoLicencia): boolean {
  return estado === 'activa' || estado === 'prueba';
}

// --- Fase 2: alumnos, clases y horarios ---

export const NIVELES_CLASE = ['infantil', 'juvenil', 'adultos', 'mixto', 'competicion'] as const;
export type NivelClase = (typeof NIVELES_CLASE)[number];

export const ETIQUETA_NIVEL: Record<NivelClase, string> = {
  infantil: 'Infantil',
  juvenil: 'Juvenil',
  adultos: 'Adultos',
  mixto: 'Mixto',
  competicion: 'Competicion',
};

export type Alumno = {
  id: string;
  dojo_id: string;
  usuario_id: string | null;
  nombre: string;
  apellido: string;
  fecha_nacimiento: string | null;
  fecha_ingreso: string;
  activo: boolean;
  notas: string | null;
  creado_el: string;
  actualizado_el: string;
};

export type Horario = {
  id: string;
  dojo_id: string;
  clase_id: string;
  dia_semana: number;
  hora_inicio: string;
  hora_fin: string;
};

export type Clase = {
  id: string;
  dojo_id: string;
  sensei_id: string | null;
  nombre: string;
  nivel: NivelClase;
  capacidad: number | null;
  activa: boolean;
  creado_el: string;
  actualizado_el: string;
};

/** Clase con lo necesario para pintarla en un listado sin consultas extra. */
export type ClaseConDetalle = Clase & {
  sensei: { id: string; nombre: string; apellido: string } | null;
  horarios: Horario[];
  inscritos: number;
};

export type AlumnoConDetalle = Alumno & {
  clases: { id: string; nombre: string }[];
  representantes: { id: string; nombre: string; apellido: string; parentesco: string | null }[];
};

export const DIAS_SEMANA = [
  'Domingo',
  'Lunes',
  'Martes',
  'Miercoles',
  'Jueves',
  'Viernes',
  'Sabado',
] as const;

/** Igual que EXTRACT(DOW): 0 = domingo. */
export function nombreDia(dia: number): string {
  return DIAS_SEMANA[dia] ?? '?';
}

/** '17:00:00' -> '17:00'. Postgres devuelve `time` con segundos. */
export function formatearHora(hora: string): string {
  return hora.slice(0, 5);
}

export function formatearFranja(horario: Pick<Horario, 'hora_inicio' | 'hora_fin'>): string {
  return `${formatearHora(horario.hora_inicio)} - ${formatearHora(horario.hora_fin)}`;
}

/**
 * Resume los horarios de una clase agrupando por franja horaria:
 * "Lun, Mie, Vie 17:00 - 18:00".
 */
export function resumirHorarios(horarios: readonly Horario[]): string {
  if (horarios.length === 0) return 'Sin horario asignado';

  const porFranja = new Map<string, number[]>();
  for (const horario of horarios) {
    const franja = formatearFranja(horario);
    const dias = porFranja.get(franja) ?? [];
    dias.push(horario.dia_semana);
    porFranja.set(franja, dias);
  }

  return [...porFranja.entries()]
    // Las franjas se listan en orden cronologico, no en el de insercion.
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([franja, dias]) => {
      const etiquetas = [...new Set(dias)]
        .sort((a, b) => a - b)
        .map((dia) => nombreDia(dia).slice(0, 3));
      return `${etiquetas.join(', ')} ${franja}`;
    })
    .join(' · ');
}

export function edadDe(fechaNacimiento: string | null, hoy = new Date()): number | null {
  if (!fechaNacimiento) return null;

  // Se parsea a mano: `new Date('2015-09-16')` se interpreta como UTC, y al
  // leerlo con getDate() en una zona horaria negativa cae un dia antes, lo que
  // daba edades desviadas en un ano alrededor del cumpleanos.
  const partes = /^(\d{4})-(\d{2})-(\d{2})/.exec(fechaNacimiento);
  if (!partes) return null;

  const [, anoTexto, mesTexto, diaTexto] = partes;
  const ano = Number(anoTexto);
  const mes = Number(mesTexto);
  const dia = Number(diaTexto);

  let edad = hoy.getFullYear() - ano;
  const diferenciaMes = hoy.getMonth() + 1 - mes;
  if (diferenciaMes < 0 || (diferenciaMes === 0 && hoy.getDate() < dia)) edad -= 1;
  return edad;
}

// --- Fase 3: asistencia ---

export type OrigenAsistencia = 'qr' | 'manual';

export type Asistencia = {
  id: string;
  dojo_id: string;
  alumno_id: string;
  clase_id: string;
  fecha: string;
  hora: string;
  origen: OrigenAsistencia;
  registrado_por: string | null;
  client_id: string;
};

export type AsistenciaConDetalle = Asistencia & {
  alumno: { id: string; nombre: string; apellido: string } | null;
  clase: { id: string; nombre: string } | null;
};

export type CodigoQr = {
  id: string;
  dojo_id: string;
  clase_id: string | null;
  token: string;
  etiqueta: string;
  activo: boolean;
};

/** Fecha de hoy en formato ISO local (no UTC), que es lo que espera Postgres. */
export function hoyISO(fecha = new Date()): string {
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

/**
 * Traduce los errores de `registrar_asistencia_qr` a algo que se pueda leer en
 * pantalla. El servidor ya devuelve mensajes en espanol; esto cubre los casos
 * de red y los codigos sin mensaje util.
 */
export function mensajeDeErrorAsistencia(error: unknown): string {
  const texto = error instanceof Error ? error.message : String(error ?? '');

  if (!texto) return 'No se pudo registrar la asistencia.';
  if (/fetch|network|conexion/i.test(texto)) {
    return 'Sin conexion. Pide al sensei que te marque manualmente.';
  }
  return texto;
}

/** Porcentaje de asistencia sobre las sesiones esperadas. */
export function porcentajeAsistencia(asistidas: number, esperadas: number): number {
  if (esperadas <= 0) return 0;
  return Math.round((asistidas / esperadas) * 100);
}

// --- Fase 4: pagos y solvencia ---

export const ESTADOS_VERIFICACION = ['pendiente', 'aprobado', 'rechazado'] as const;
export type EstadoVerificacion = (typeof ESTADOS_VERIFICACION)[number];

export const ETIQUETA_ESTADO_VERIFICACION: Record<EstadoVerificacion, string> = {
  pendiente: 'Pendiente',
  aprobado: 'Aprobado',
  rechazado: 'Rechazado',
};

export const PERIODICIDADES = ['mensual', 'trimestral', 'anual'] as const;
export type Periodicidad = (typeof PERIODICIDADES)[number];

export const ETIQUETA_PERIODICIDAD: Record<Periodicidad, string> = {
  mensual: 'Mensual',
  trimestral: 'Trimestral',
  anual: 'Anual',
};

export type PlanPago = {
  id: string;
  dojo_id: string;
  nombre: string;
  monto: number;
  moneda: string;
  periodicidad: Periodicidad;
  activo: boolean;
};

export type Pago = {
  id: string;
  dojo_id: string;
  alumno_id: string;
  plan_id: string | null;
  periodo: string;
  monto: number;
  moneda: string;
  referencia: string | null;
  comprobante_url: string | null;
  estado: EstadoVerificacion;
  motivo_rechazo: string | null;
  verificado_por: string | null;
  verificado_el: string | null;
  creado_el: string;
};

export type PagoConDetalle = Pago & {
  alumno: { id: string; nombre: string; apellido: string } | null;
  plan: { id: string; nombre: string } | null;
};

export type Solvencia = {
  alumno_id: string;
  dojo_id: string;
  nombre: string;
  apellido: string;
  ultimo_periodo_pagado: string | null;
  cubierto_hasta: string | null;
  solvente: boolean;
  dias_de_atraso: number | null;
};

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
] as const;

/** '2026-03-01' -> 'marzo de 2026'. Se parsea a mano para no cruzar zonas horarias. */
export function nombrePeriodo(periodo: string): string {
  const partes = /^(\d{4})-(\d{2})/.exec(periodo);
  if (!partes) return periodo;
  const mes = MESES[Number(partes[2]) - 1] ?? '';
  return `${mes} de ${partes[1]}`;
}

/** Primer dia del mes indicado, que es lo que exige la restriccion de `pagos`. */
export function periodoDeMes(fecha = new Date(), desplazamientoMeses = 0): string {
  const base = new Date(fecha.getFullYear(), fecha.getMonth() + desplazamientoMeses, 1);
  const mes = String(base.getMonth() + 1).padStart(2, '0');
  return `${base.getFullYear()}-${mes}-01`;
}

export function formatearMonto(monto: number, moneda = 'USD'): string {
  return `${moneda} ${monto.toFixed(2)}`;
}

export function tonoDeEstado(estado: EstadoVerificacion): 'exito' | 'advertencia' | 'peligro' {
  if (estado === 'aprobado') return 'exito';
  if (estado === 'rechazado') return 'peligro';
  return 'advertencia';
}

/** Texto corto del estado de cuenta, para cabeceras y listados. */
export function resumenSolvencia(solvencia: Solvencia | null | undefined): string {
  if (!solvencia) return 'Sin informacion de pagos';
  if (solvencia.solvente) {
    return solvencia.cubierto_hasta
      ? `Al dia hasta el ${solvencia.cubierto_hasta}`
      : 'Al dia';
  }
  if (!solvencia.ultimo_periodo_pagado) return 'Sin pagos registrados';
  return `${solvencia.dias_de_atraso ?? 0} dias de atraso`;
}

// --- Fase 5: grados y cinturones ---

export type ResultadoExamen = 'aprobado' | 'reprobado';

export type Cinturon = {
  id: string;
  dojo_id: string;
  nombre: string;
  color: string;
  orden: number;
};

export type RequisitoGrado = {
  id: string;
  dojo_id: string;
  cinturon_id: string;
  asistencias_minimas: number;
  meses_minimos_en_grado_anterior: number;
  requiere_solvencia: boolean;
};

export type Examen = {
  id: string;
  dojo_id: string;
  alumno_id: string;
  cinturon_destino_id: string;
  fecha: string;
  resultado: ResultadoExamen;
  evaluador_id: string | null;
  observaciones: string | null;
};

export type ExamenConDetalle = Examen & {
  alumno: { id: string; nombre: string; apellido: string } | null;
  cinturon: { id: string; nombre: string; color: string } | null;
};

export type Certificado = {
  id: string;
  dojo_id: string;
  examen_id: string;
  alumno_id: string;
  codigo: string;
  emitido_el: string;
};

/** Lo que devuelve `progreso_de_grado(alumno)`. */
export type ProgresoGrado = {
  cinturon_actual: string;
  siguiente_cinturon: string | null;
  siguiente_id: string | null;
  asistencias: number;
  asistencias_minimas: number;
  meses_en_grado: number;
  meses_minimos: number;
  requiere_solvencia: boolean;
  solvente: boolean;
  elegible: boolean;
};

/** Avance 0-1 de un requisito. Se recorta a 1: pasarse no es mas del 100%. */
export function avanceRequisito(actual: number, minimo: number): number {
  if (minimo <= 0) return 1;
  return Math.min(actual / minimo, 1);
}

/** Lo que le falta al alumno, en lenguaje llano, para el siguiente grado. */
export function faltantesParaGrado(progreso: ProgresoGrado): string[] {
  const faltan: string[] = [];

  const asistencias = progreso.asistencias_minimas - progreso.asistencias;
  if (asistencias > 0) {
    faltan.push(`${asistencias} ${asistencias === 1 ? 'asistencia' : 'asistencias'}`);
  }

  const meses = progreso.meses_minimos - progreso.meses_en_grado;
  if (meses > 0) {
    faltan.push(`${meses} ${meses === 1 ? 'mes' : 'meses'} en el grado actual`);
  }

  if (progreso.requiere_solvencia && !progreso.solvente) {
    faltan.push('estar al dia con los pagos');
  }

  return faltan;
}

/**
 * Un color de cinturon claro (blanco, amarillo) necesita texto oscuro encima.
 * Luminancia relativa simplificada, suficiente para decidir el contraste.
 */
export function textoSobreCinturon(color: string): '#16120F' | '#F7F4F1' {
  const hex = color.replace('#', '');
  if (hex.length !== 6) return '#16120F';

  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const luminancia = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  return luminancia > 0.6 ? '#16120F' : '#F7F4F1';
}

// --- Fase 6: eventos ---

export const TIPOS_EVENTO = ['torneo', 'seminario', 'examen_especial', 'otro'] as const;
export type TipoEvento = (typeof TIPOS_EVENTO)[number];

export const ETIQUETA_TIPO_EVENTO: Record<TipoEvento, string> = {
  torneo: 'Torneo',
  seminario: 'Seminario',
  examen_especial: 'Examen especial',
  otro: 'Otro',
};

export type Evento = {
  id: string;
  dojo_id: string;
  nombre: string;
  descripcion: string | null;
  tipo: TipoEvento;
  fecha: string;
  hora: string | null;
  lugar: string | null;
  cupo: number | null;
  costo: number;
  moneda: string;
  activo: boolean;
  inscritos: number;
  plazas_libres: number | null;
};

export type Inscripcion = {
  id: string;
  dojo_id: string;
  evento_id: string;
  alumno_id: string;
  comprobante_url: string | null;
  estado: EstadoVerificacion;
  motivo_rechazo: string | null;
  creado_el: string;
};

export type InscripcionConDetalle = Inscripcion & {
  alumno: { id: string; nombre: string; apellido: string } | null;
  evento: { id: string; nombre: string; fecha: string } | null;
};

export function esGratuito(evento: Pick<Evento, 'costo'>): boolean {
  return Number(evento.costo) === 0;
}

export function eventoLleno(evento: Pick<Evento, 'cupo' | 'plazas_libres'>): boolean {
  return evento.cupo !== null && (evento.plazas_libres ?? 0) <= 0;
}

/** Dias que faltan para el evento. Negativo si ya paso. */
export function diasHasta(fecha: string, hoy = new Date()): number {
  const partes = /^(\d{4})-(\d{2})-(\d{2})/.exec(fecha);
  if (!partes) return 0;

  const objetivo = new Date(Number(partes[1]), Number(partes[2]) - 1, Number(partes[3]));
  const base = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  return Math.round((objetivo.getTime() - base.getTime()) / 86400000);
}

export function resumenFechaEvento(evento: Pick<Evento, 'fecha' | 'hora'>): string {
  const dias = diasHasta(evento.fecha);
  const hora = evento.hora ? ` · ${formatearHora(evento.hora)}` : '';

  if (dias === 0) return `Hoy${hora}`;
  if (dias === 1) return `Manana${hora}`;
  if (dias > 1) return `En ${dias} dias · ${evento.fecha}${hora}`;
  return `Paso el ${evento.fecha}`;
}

// --- Fase 7: plataforma ---

export type Suscripcion = {
  id: string;
  dojo_id: string;
  periodo: string;
  monto: number;
  moneda: string;
  comprobante_url: string | null;
  estado: EstadoVerificacion;
  motivo_rechazo: string | null;
  creado_el: string;
};

export const ESTADOS_TICKET = ['abierto', 'en_proceso', 'cerrado'] as const;
export type EstadoTicket = (typeof ESTADOS_TICKET)[number];

export const ETIQUETA_ESTADO_TICKET: Record<EstadoTicket, string> = {
  abierto: 'Abierto',
  en_proceso: 'En proceso',
  cerrado: 'Cerrado',
};

export type Ticket = {
  id: string;
  dojo_id: string;
  abierto_por: string | null;
  asunto: string;
  descripcion: string;
  estado: EstadoTicket;
  respuesta: string | null;
  cerrado_el: string | null;
  creado_el: string;
};

export type MetricaDojo = {
  dojo_id: string;
  dojo: string;
  estado_licencia: EstadoLicencia;
  licencia_vence_el: string | null;
  alumnos_activos: number;
  clases_activas: number;
  usuarios: number;
  asistencias_30d: number;
  ingresos_mes: number;
  suscripcion_al_dia: boolean;
};

/** Totales de la plataforma a partir de las metricas por dojo. */
export function totalesPlataforma(metricas: readonly MetricaDojo[]) {
  return {
    dojos: metricas.length,
    dojosActivos: metricas.filter((m) => licenciaPermiteOperar(m.estado_licencia)).length,
    alumnos: metricas.reduce((suma, m) => suma + m.alumnos_activos, 0),
    asistencias30d: metricas.reduce((suma, m) => suma + m.asistencias_30d, 0),
    ingresosMes: metricas.reduce((suma, m) => suma + Number(m.ingresos_mes), 0),
    morosos: metricas.filter((m) => !m.suscripcion_al_dia).length,
  };
}

// --- Fase 8: notificaciones ---

export type TipoNotificacion =
  | 'pago_aprobado'
  | 'pago_rechazado'
  | 'examen_registrado'
  | 'evento_nuevo'
  | 'inscripcion_resuelta'
  | 'licencia'
  | 'soporte';

export type Notificacion = {
  id: string;
  dojo_id: string | null;
  usuario_id: string;
  tipo: TipoNotificacion;
  titulo: string;
  cuerpo: string;
  datos: Record<string, unknown>;
  leida: boolean;
  creado_el: string;
};

export const ICONO_NOTIFICACION: Record<TipoNotificacion, string> = {
  pago_aprobado: 'checkmark-circle-outline',
  pago_rechazado: 'close-circle-outline',
  examen_registrado: 'ribbon-outline',
  evento_nuevo: 'calendar-outline',
  inscripcion_resuelta: 'ticket-outline',
  licencia: 'key-outline',
  soporte: 'help-buoy-outline',
};

/** "hace 5 min", "ayer"… para listados de notificaciones. */
export function haceCuanto(iso: string, ahora = new Date()): string {
  const minutos = Math.round((ahora.getTime() - new Date(iso).getTime()) / 60000);

  if (minutos < 1) return 'ahora';
  if (minutos < 60) return `hace ${minutos} min`;

  const horas = Math.round(minutos / 60);
  if (horas < 24) return `hace ${horas} h`;

  const dias = Math.round(horas / 24);
  if (dias === 1) return 'ayer';
  if (dias < 30) return `hace ${dias} dias`;

  return new Date(iso).toISOString().slice(0, 10);
}
