import type { Evento, InscripcionConDetalle, TipoEvento } from '@ossapp/core';
import { obtenerCliente } from '../client';

const CAMPOS_INSCRIPCION =
  'id, dojo_id, evento_id, alumno_id, comprobante_url, estado, motivo_rechazo, creado_el, alumno:alumnos(id, nombre, apellido), evento:eventos(id, nombre, fecha)';

/**
 * Cartelera del dojo. Se lee de `vista_eventos`, que ya trae inscritos y plazas
 * libres: contarlas por separado daria N+1 consultas y un cupo desactualizado.
 */
export async function listarEventos(soloProximos = false): Promise<Evento[]> {
  let consulta = obtenerCliente()
    .from('vista_eventos')
    .select(
      'id, dojo_id, nombre, descripcion, tipo, fecha, hora, lugar, cupo, costo, moneda, activo, inscritos, plazas_libres',
    )
    .order('fecha');

  if (soloProximos) consulta = consulta.gte('fecha', new Date().toISOString().slice(0, 10));

  const { data, error } = await consulta;
  if (error) throw error;
  return (data ?? []) as unknown as Evento[];
}

export async function crearEvento(
  dojoId: string,
  datos: {
    nombre: string;
    tipo: TipoEvento;
    fecha: string;
    hora?: string | null;
    lugar?: string | null;
    descripcion?: string | null;
    cupo?: number | null;
    costo?: number;
  },
): Promise<void> {
  const { error } = await obtenerCliente()
    .from('eventos')
    .insert({ ...datos, dojo_id: dojoId });
  if (error) throw error;
}

export async function actualizarEvento(
  id: string,
  datos: Partial<{ nombre: string; cupo: number | null; activo: boolean; costo: number }>,
): Promise<void> {
  const { error } = await obtenerCliente().from('eventos').update(datos).eq('id', id);
  if (error) throw error;
}

export async function listarInscripciones(
  filtro: { eventoId?: string; estado?: InscripcionConDetalle['estado'] } = {},
): Promise<InscripcionConDetalle[]> {
  let consulta = obtenerCliente()
    .from('inscripciones')
    .select(CAMPOS_INSCRIPCION)
    .order('creado_el', { ascending: false });

  if (filtro.eventoId) consulta = consulta.eq('evento_id', filtro.eventoId);
  if (filtro.estado) consulta = consulta.eq('estado', filtro.estado);

  const { data, error } = await consulta;
  if (error) throw error;
  return (data ?? []) as unknown as InscripcionConDetalle[];
}

/**
 * Inscribe a un alumno. El control de cupo lo hace el servidor: comprobarlo
 * aqui no evitaria que dos personas cogieran la ultima plaza a la vez.
 */
export async function inscribirse(datos: {
  dojoId: string;
  eventoId: string;
  alumnoId: string;
  comprobanteUrl?: string | null;
}): Promise<void> {
  const { error } = await obtenerCliente().from('inscripciones').insert({
    dojo_id: datos.dojoId,
    evento_id: datos.eventoId,
    alumno_id: datos.alumnoId,
    comprobante_url: datos.comprobanteUrl ?? null,
  });
  if (error) throw new Error(error.message);
}

export async function verificarInscripcion(
  id: string,
  decision: { aprobar: true } | { aprobar: false; motivo: string },
): Promise<void> {
  const cambios = decision.aprobar
    ? { estado: 'aprobado' as const, motivo_rechazo: null }
    : { estado: 'rechazado' as const, motivo_rechazo: decision.motivo };

  const { error } = await obtenerCliente().from('inscripciones').update(cambios).eq('id', id);
  if (error) throw error;
}
