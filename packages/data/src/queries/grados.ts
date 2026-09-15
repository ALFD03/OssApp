import type {
  Certificado,
  Cinturon,
  ExamenConDetalle,
  ProgresoGrado,
  RequisitoGrado,
  ResultadoExamen,
} from '@ossapp/core';
import { obtenerCliente } from '../client';

export async function listarCinturones(): Promise<Cinturon[]> {
  const { data, error } = await obtenerCliente()
    .from('cinturones')
    .select('id, dojo_id, nombre, color, orden')
    .order('orden');

  if (error) throw error;
  return (data ?? []) as Cinturon[];
}

export async function listarRequisitos(): Promise<RequisitoGrado[]> {
  const { data, error } = await obtenerCliente()
    .from('requisitos_grado')
    .select('id, dojo_id, cinturon_id, asistencias_minimas, meses_minimos_en_grado_anterior, requiere_solvencia');

  if (error) throw error;
  return (data ?? []) as RequisitoGrado[];
}

export async function guardarRequisito(
  dojoId: string,
  cinturonId: string,
  datos: {
    asistencias_minimas: number;
    meses_minimos_en_grado_anterior: number;
    requiere_solvencia: boolean;
  },
): Promise<void> {
  // upsert sobre la restriccion unica por cinturon: definir requisitos dos veces
  // es editar los existentes, no crear un duplicado.
  const { error } = await obtenerCliente()
    .from('requisitos_grado')
    .upsert({ ...datos, dojo_id: dojoId, cinturon_id: cinturonId }, { onConflict: 'cinturon_id' });

  if (error) throw error;
}

export async function listarExamenes(alumnoId?: string): Promise<ExamenConDetalle[]> {
  let consulta = obtenerCliente()
    .from('examenes')
    .select(
      'id, dojo_id, alumno_id, cinturon_destino_id, fecha, resultado, evaluador_id, observaciones, alumno:alumnos(id, nombre, apellido), cinturon:cinturones(id, nombre, color)',
    )
    .order('fecha', { ascending: false });

  if (alumnoId) consulta = consulta.eq('alumno_id', alumnoId);

  const { data, error } = await consulta;
  if (error) throw error;
  return (data ?? []) as unknown as ExamenConDetalle[];
}

/**
 * Registra el resultado de un examen.
 *
 * Si es aprobado, el servidor sube el cinturon del alumno y emite el
 * certificado (trigger `aplicar_examen_aprobado`). El cliente no hace ninguna
 * de esas dos cosas.
 */
export async function registrarExamen(datos: {
  dojoId: string;
  alumnoId: string;
  cinturonDestinoId: string;
  resultado: ResultadoExamen;
  observaciones?: string | null;
  fecha?: string;
}): Promise<void> {
  const { error } = await obtenerCliente().from('examenes').insert({
    dojo_id: datos.dojoId,
    alumno_id: datos.alumnoId,
    cinturon_destino_id: datos.cinturonDestinoId,
    resultado: datos.resultado,
    observaciones: datos.observaciones ?? null,
    fecha: datos.fecha,
  });

  if (error) throw error;
}

export async function listarCertificados(alumnoId?: string): Promise<Certificado[]> {
  let consulta = obtenerCliente()
    .from('certificados')
    .select('id, dojo_id, examen_id, alumno_id, codigo, emitido_el')
    .order('emitido_el', { ascending: false });

  if (alumnoId) consulta = consulta.eq('alumno_id', alumnoId);

  const { data, error } = await consulta;
  if (error) throw error;
  return (data ?? []) as Certificado[];
}

/** Progreso hacia el siguiente grado, calculado en el servidor. */
export async function obtenerProgreso(alumnoId: string): Promise<ProgresoGrado | null> {
  const { data, error } = await obtenerCliente().rpc('progreso_de_grado', {
    p_alumno_id: alumnoId,
  });

  if (error) throw error;
  const filas = (data ?? []) as unknown as ProgresoGrado[];
  return filas[0] ?? null;
}
