import type { Asistencia, AsistenciaConDetalle, CodigoQr } from '@ossapp/core';
import { obtenerCliente } from '../client';

const CAMPOS =
  'id, dojo_id, alumno_id, clase_id, fecha, hora, origen, registrado_por, client_id';

const CAMPOS_DETALLE = `${CAMPOS}, alumno:alumnos(id, nombre, apellido), clase:clases(id, nombre)`;

/**
 * Registra la asistencia escaneando el QR.
 *
 * Toda la validacion (token valido, clase en horario, alumno inscrito, permiso
 * sobre el alumno) ocurre en el servidor dentro de registrar_asistencia_qr:
 * el cliente no decide nada de eso.
 *
 * `clientId` lo genera la app ANTES de enviar. Si la llamada se reintenta tras
 * un fallo de red, el servidor deduplica por ese identificador.
 */
export async function registrarAsistenciaQr(
  token: string,
  alumnoId: string,
  clientId?: string,
): Promise<Asistencia> {
  const { data, error } = await obtenerCliente().rpc('registrar_asistencia_qr', {
    p_token: token,
    p_alumno_id: alumnoId,
    p_client_id: clientId,
  });

  if (error) throw new Error(error.message);
  return data as unknown as Asistencia;
}

export type FiltroAsistencia = {
  claseId?: string;
  alumnoId?: string;
  desde?: string;
  hasta?: string;
};

export async function listarAsistencias(
  filtro: FiltroAsistencia = {},
): Promise<AsistenciaConDetalle[]> {
  let consulta = obtenerCliente()
    .from('asistencias')
    .select(CAMPOS_DETALLE)
    .order('fecha', { ascending: false })
    .order('hora', { ascending: false });

  if (filtro.claseId) consulta = consulta.eq('clase_id', filtro.claseId);
  if (filtro.alumnoId) consulta = consulta.eq('alumno_id', filtro.alumnoId);
  if (filtro.desde) consulta = consulta.gte('fecha', filtro.desde);
  if (filtro.hasta) consulta = consulta.lte('fecha', filtro.hasta);

  const { data, error } = await consulta;
  if (error) throw error;
  return (data ?? []) as unknown as AsistenciaConDetalle[];
}

/** Marcado manual de respaldo (sensei o maestro). */
export async function marcarAsistenciaManual(
  dojoId: string,
  claseId: string,
  alumnoId: string,
  fecha?: string,
): Promise<void> {
  const { error } = await obtenerCliente().from('asistencias').insert({
    dojo_id: dojoId,
    clase_id: claseId,
    alumno_id: alumnoId,
    origen: 'manual',
    fecha,
  });

  // Ya marcada hoy: no es un error que deba ver el sensei.
  if (error && error.code !== '23505') throw error;
}

export async function quitarAsistencia(id: string): Promise<void> {
  const { error } = await obtenerCliente().from('asistencias').delete().eq('id', id);
  if (error) throw error;
}

/** Codigos QR del dojo. Solo el staff los puede leer (politica RLS). */
export async function listarCodigosQr(): Promise<CodigoQr[]> {
  const { data, error } = await obtenerCliente()
    .from('codigos_qr')
    .select('id, dojo_id, clase_id, token, etiqueta, activo')
    .eq('activo', true)
    .order('etiqueta');

  if (error) throw error;
  return (data ?? []) as CodigoQr[];
}
