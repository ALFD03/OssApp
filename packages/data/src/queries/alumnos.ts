import type { Alumno, AlumnoConDetalle } from '@ossapp/core';
import { obtenerCliente } from '../client';

const CAMPOS =
  'id, dojo_id, usuario_id, nombre, apellido, fecha_nacimiento, fecha_ingreso, activo, notas, creado_el, actualizado_el';

const CAMPOS_DETALLE = `${CAMPOS},
  clase_alumno(clase:clases(id, nombre)),
  representante_alumno(parentesco, representante:usuarios(id, nombre, apellido))`;

type FilaDetalle = Alumno & {
  clase_alumno: { clase: { id: string; nombre: string } | null }[] | null;
  representante_alumno:
    | { parentesco: string | null; representante: { id: string; nombre: string; apellido: string } | null }[]
    | null;
};

function aDetalle(fila: FilaDetalle): AlumnoConDetalle {
  const { clase_alumno, representante_alumno, ...alumno } = fila;
  return {
    ...alumno,
    clases: (clase_alumno ?? []).flatMap((c) => (c.clase ? [c.clase] : [])),
    representantes: (representante_alumno ?? []).flatMap((r) =>
      r.representante ? [{ ...r.representante, parentesco: r.parentesco }] : [],
    ),
  };
}

/**
 * Alumnos visibles para el usuario autenticado.
 *
 * RLS decide el alcance: el staff recibe los del dojo, el representante solo los
 * suyos y el alumno solo su propia ficha. Aqui no se filtra por dojo.
 */
export async function listarAlumnos(
  opciones: { soloActivos?: boolean } = {},
): Promise<AlumnoConDetalle[]> {
  let consulta = obtenerCliente()
    .from('alumnos')
    .select(CAMPOS_DETALLE)
    .order('apellido')
    .order('nombre');

  if (opciones.soloActivos) consulta = consulta.eq('activo', true);

  const { data, error } = await consulta;
  if (error) throw error;
  return ((data ?? []) as unknown as FilaDetalle[]).map(aDetalle);
}

export async function obtenerAlumno(id: string): Promise<AlumnoConDetalle | null> {
  const { data, error } = await obtenerCliente()
    .from('alumnos')
    .select(CAMPOS_DETALLE)
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data ? aDetalle(data as unknown as FilaDetalle) : null;
}

export type DatosAlumno = {
  nombre: string;
  apellido: string;
  fecha_nacimiento?: string | null;
  fecha_ingreso?: string;
  notas?: string | null;
  activo?: boolean;
};

/**
 * Crea un alumno en el dojo indicado. `dojo_id` se pasa explicito porque es una
 * columna NOT NULL; la politica RLS comprueba que coincida con el dojo del maestro.
 */
export async function crearAlumno(dojoId: string, datos: DatosAlumno): Promise<Alumno> {
  const { data, error } = await obtenerCliente()
    .from('alumnos')
    .insert({ ...datos, dojo_id: dojoId })
    .select(CAMPOS)
    .single();

  if (error) throw error;
  return data as Alumno;
}

export async function actualizarAlumno(id: string, datos: Partial<DatosAlumno>): Promise<void> {
  const { error } = await obtenerCliente().from('alumnos').update(datos).eq('id', id);
  if (error) throw error;
}

/** Baja logica. No se borra el historial de asistencia ni de pagos. */
export async function archivarAlumno(id: string): Promise<void> {
  await actualizarAlumno(id, { activo: false });
}

export async function asignarAClase(
  dojoId: string,
  claseId: string,
  alumnoId: string,
): Promise<void> {
  const { error } = await obtenerCliente()
    .from('clase_alumno')
    .insert({ dojo_id: dojoId, clase_id: claseId, alumno_id: alumnoId });
  if (error) throw error;
}

export async function quitarDeClase(claseId: string, alumnoId: string): Promise<void> {
  const { error } = await obtenerCliente()
    .from('clase_alumno')
    .delete()
    .eq('clase_id', claseId)
    .eq('alumno_id', alumnoId);
  if (error) throw error;
}

export async function asignarRepresentante(
  dojoId: string,
  alumnoId: string,
  representanteId: string,
  parentesco?: string,
): Promise<void> {
  const { error } = await obtenerCliente().from('representante_alumno').insert({
    dojo_id: dojoId,
    alumno_id: alumnoId,
    representante_id: representanteId,
    parentesco: parentesco ?? null,
  });
  if (error) throw error;
}
