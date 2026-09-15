import type { MetricaDojo, Suscripcion, Ticket } from '@ossapp/core';
import { obtenerCliente } from '../client';

const CAMPOS_SUSCRIPCION =
  'id, dojo_id, periodo, monto, moneda, comprobante_url, estado, motivo_rechazo, creado_el';

const CAMPOS_TICKET =
  'id, dojo_id, abierto_por, asunto, descripcion, estado, respuesta, cerrado_el, creado_el';

/**
 * Metricas globales. La funcion es SECURITY DEFINER y comprueba dentro que
 * quien llama sea superadmin, asi que a cualquier otro rol le devuelve vacio.
 */
export async function listarMetricas(): Promise<MetricaDojo[]> {
  const { data, error } = await obtenerCliente().rpc('metricas_plataforma');
  if (error) throw error;
  return (data ?? []) as unknown as MetricaDojo[];
}

export async function listarSuscripciones(
  estado?: Suscripcion['estado'],
): Promise<(Suscripcion & { dojo: { id: string; nombre: string } | null })[]> {
  let consulta = obtenerCliente()
    .from('suscripciones')
    .select(`${CAMPOS_SUSCRIPCION}, dojo:dojos(id, nombre)`)
    .order('periodo', { ascending: false });

  if (estado) consulta = consulta.eq('estado', estado);

  const { data, error } = await consulta;
  if (error) throw error;
  return (data ?? []) as unknown as (Suscripcion & { dojo: { id: string; nombre: string } | null })[];
}

/** El maestro sube el comprobante del pago de su dojo a la plataforma. */
export async function subirSuscripcion(datos: {
  dojoId: string;
  periodo: string;
  monto: number;
  comprobanteUrl?: string | null;
  referencia?: string | null;
}): Promise<void> {
  const { error } = await obtenerCliente().from('suscripciones').insert({
    dojo_id: datos.dojoId,
    periodo: datos.periodo,
    monto: datos.monto,
    comprobante_url: datos.comprobanteUrl ?? null,
    referencia: datos.referencia ?? null,
  });
  if (error) throw error;
}

/**
 * Verifica el pago de una suscripcion. Al aprobar, el servidor reactiva la
 * licencia del dojo y mueve su fecha de vencimiento.
 */
export async function verificarSuscripcion(
  id: string,
  decision: { aprobar: true } | { aprobar: false; motivo: string },
): Promise<void> {
  const cambios = decision.aprobar
    ? { estado: 'aprobado' as const, motivo_rechazo: null }
    : { estado: 'rechazado' as const, motivo_rechazo: decision.motivo };

  const { error } = await obtenerCliente().from('suscripciones').update(cambios).eq('id', id);
  if (error) throw error;
}

/** Suspender o reactivar un dojo a mano, al margen del cobro. */
export async function cambiarLicencia(
  dojoId: string,
  estado: 'activa' | 'prueba' | 'suspendida' | 'vencida',
): Promise<void> {
  const { error } = await obtenerCliente()
    .from('dojos')
    .update({ estado_licencia: estado })
    .eq('id', dojoId);
  if (error) throw error;
}

export async function listarTickets(estado?: Ticket['estado']): Promise<
  (Ticket & { dojo: { id: string; nombre: string } | null })[]
> {
  let consulta = obtenerCliente()
    .from('tickets_soporte')
    .select(`${CAMPOS_TICKET}, dojo:dojos(id, nombre)`)
    .order('creado_el', { ascending: false });

  if (estado) consulta = consulta.eq('estado', estado);

  const { data, error } = await consulta;
  if (error) throw error;
  return (data ?? []) as unknown as (Ticket & { dojo: { id: string; nombre: string } | null })[];
}

export async function abrirTicket(
  dojoId: string,
  asunto: string,
  descripcion: string,
): Promise<void> {
  const { error } = await obtenerCliente()
    .from('tickets_soporte')
    .insert({ dojo_id: dojoId, asunto, descripcion });
  if (error) throw error;
}

export async function responderTicket(
  id: string,
  respuesta: string,
  estado: Ticket['estado'],
): Promise<void> {
  const { error } = await obtenerCliente()
    .from('tickets_soporte')
    .update({ respuesta, estado })
    .eq('id', id);
  if (error) throw error;
}
