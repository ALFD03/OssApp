import type { Clase, ClaseConDetalle, Horario, NivelClase } from '@ossapp/core';
import { obtenerCliente } from '../client';

const CAMPOS = 'id, dojo_id, sensei_id, nombre, nivel, capacidad, activa, creado_el, actualizado_el';

const CAMPOS_DETALLE = `${CAMPOS},
  sensei:usuarios(id, nombre, apellido),
  horarios(id, dojo_id, clase_id, dia_semana, hora_inicio, hora_fin),
  clase_alumno(count)`;

type FilaDetalle = Clase & {
  sensei: { id: string; nombre: string; apellido: string } | null;
  horarios: Horario[] | null;
  clase_alumno: { count: number }[] | null;
};

function aDetalle(fila: FilaDetalle): ClaseConDetalle {
  const { horarios, clase_alumno, ...clase } = fila;
  return {
    ...clase,
    horarios: [...(horarios ?? [])].sort(
      (a, b) => a.dia_semana - b.dia_semana || a.hora_inicio.localeCompare(b.hora_inicio),
    ),
    inscritos: clase_alumno?.[0]?.count ?? 0,
  };
}

/** Clases visibles. Todo el dojo puede leer el catalogo; RLS acota al dojo. */
export async function listarClases(
  opciones: { soloActivas?: boolean; senseiId?: string } = {},
): Promise<ClaseConDetalle[]> {
  let consulta = obtenerCliente().from('clases').select(CAMPOS_DETALLE).order('nombre');

  if (opciones.soloActivas) consulta = consulta.eq('activa', true);
  // Filtro de conveniencia para la vista "Mis clases" del sensei.
  if (opciones.senseiId) consulta = consulta.eq('sensei_id', opciones.senseiId);

  const { data, error } = await consulta;
  if (error) throw error;
  return ((data ?? []) as unknown as FilaDetalle[]).map(aDetalle);
}

export async function obtenerClase(id: string): Promise<ClaseConDetalle | null> {
  const { data, error } = await obtenerCliente()
    .from('clases')
    .select(CAMPOS_DETALLE)
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data ? aDetalle(data as unknown as FilaDetalle) : null;
}

export type DatosClase = {
  nombre: string;
  nivel: NivelClase;
  sensei_id?: string | null;
  capacidad?: number | null;
  activa?: boolean;
};

export async function crearClase(dojoId: string, datos: DatosClase): Promise<Clase> {
  const { data, error } = await obtenerCliente()
    .from('clases')
    .insert({ ...datos, dojo_id: dojoId })
    .select(CAMPOS)
    .single();

  if (error) throw error;
  return data as Clase;
}

export async function actualizarClase(id: string, datos: Partial<DatosClase>): Promise<void> {
  const { error } = await obtenerCliente().from('clases').update(datos).eq('id', id);
  if (error) throw error;
}

export async function anadirHorario(
  dojoId: string,
  claseId: string,
  horario: { dia_semana: number; hora_inicio: string; hora_fin: string },
): Promise<void> {
  const { error } = await obtenerCliente()
    .from('horarios')
    .insert({ ...horario, dojo_id: dojoId, clase_id: claseId });
  if (error) throw error;
}

export async function eliminarHorario(id: string): Promise<void> {
  const { error } = await obtenerCliente().from('horarios').delete().eq('id', id);
  if (error) throw error;
}

/** Alumnos inscritos en una clase, para la lista de pase de asistencia (Fase 3). */
export async function listarAlumnosDeClase(
  claseId: string,
): Promise<{ id: string; nombre: string; apellido: string }[]> {
  const { data, error } = await obtenerCliente()
    .from('clase_alumno')
    .select('alumno:alumnos(id, nombre, apellido)')
    .eq('clase_id', claseId);

  if (error) throw error;
  return ((data ?? []) as unknown as { alumno: { id: string; nombre: string; apellido: string } | null }[])
    .flatMap((fila) => (fila.alumno ? [fila.alumno] : []))
    .sort((a, b) => a.apellido.localeCompare(b.apellido));
}
