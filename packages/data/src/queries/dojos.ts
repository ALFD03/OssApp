import type { Dojo } from '@ossapp/core';
import { obtenerCliente } from '../client';

const CAMPOS = 'id, nombre, slug, estado_licencia, licencia_vence_el, activo, creado_el, actualizado_el';

/**
 * Lista los dojos visibles. El aislamiento lo aplica RLS: un maestro recibe
 * solo su dojo y el superadmin todos. No se filtra por dojo_id en cliente.
 */
export async function listarDojos(): Promise<Dojo[]> {
  const { data, error } = await obtenerCliente().from('dojos').select(CAMPOS).order('nombre');
  if (error) throw error;
  return (data ?? []) as Dojo[];
}

export async function obtenerDojo(id: string): Promise<Dojo | null> {
  const { data, error } = await obtenerCliente().from('dojos').select(CAMPOS).eq('id', id).maybeSingle();
  if (error) throw error;
  return (data as Dojo) ?? null;
}
