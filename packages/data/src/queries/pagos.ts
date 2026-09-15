import type { Pago, PagoConDetalle, PlanPago, Solvencia } from '@ossapp/core';
import { obtenerCliente } from '../client';

const BUCKET = 'comprobantes';

const CAMPOS =
  'id, dojo_id, alumno_id, plan_id, periodo, monto, moneda, referencia, comprobante_url, estado, motivo_rechazo, verificado_por, verificado_el, creado_el';

const CAMPOS_DETALLE = `${CAMPOS}, alumno:alumnos(id, nombre, apellido), plan:planes_pago(id, nombre)`;

export async function listarPlanes(): Promise<PlanPago[]> {
  const { data, error } = await obtenerCliente()
    .from('planes_pago')
    .select('id, dojo_id, nombre, monto, moneda, periodicidad, activo')
    .eq('activo', true)
    .order('monto');

  if (error) throw error;
  return (data ?? []) as PlanPago[];
}

export async function crearPlan(
  dojoId: string,
  datos: { nombre: string; monto: number; periodicidad: PlanPago['periodicidad']; moneda?: string },
): Promise<void> {
  const { error } = await obtenerCliente()
    .from('planes_pago')
    .insert({ ...datos, dojo_id: dojoId });
  if (error) throw error;
}

export async function listarPagos(
  filtro: { estado?: Pago['estado']; alumnoId?: string } = {},
): Promise<PagoConDetalle[]> {
  let consulta = obtenerCliente()
    .from('pagos')
    .select(CAMPOS_DETALLE)
    .order('periodo', { ascending: false })
    .order('creado_el', { ascending: false });

  if (filtro.estado) consulta = consulta.eq('estado', filtro.estado);
  if (filtro.alumnoId) consulta = consulta.eq('alumno_id', filtro.alumnoId);

  const { data, error } = await consulta;
  if (error) throw error;
  return (data ?? []) as unknown as PagoConDetalle[];
}

/**
 * Sube el comprobante al bucket privado.
 *
 * La ruta es <dojo_id>/<alumno_id>/<archivo>: las politicas de storage comparan
 * la primera carpeta con el dojo del usuario, asi que la estructura no es
 * cosmetica, es parte del control de acceso.
 */
export async function subirComprobante(
  dojoId: string,
  alumnoId: string,
  archivo: { uri: string; nombre: string; tipo: string },
): Promise<string> {
  const cliente = obtenerCliente();
  const extension = archivo.nombre.split('.').pop() ?? 'jpg';
  const ruta = `${dojoId}/${alumnoId}/${Date.now()}.${extension}`;

  // En React Native hay que mandar un ArrayBuffer: el File/Blob del navegador
  // no existe y un fetch directo del uri local da un blob vacio en Android.
  const respuesta = await fetch(archivo.uri);
  const datos = await respuesta.arrayBuffer();

  const { error } = await cliente.storage
    .from(BUCKET)
    .upload(ruta, datos, { contentType: archivo.tipo, upsert: false });

  if (error) throw error;
  return ruta;
}

/** URL temporal para ver un comprobante. El bucket es privado: no hay URL fija. */
export async function urlDeComprobante(ruta: string, segundos = 300): Promise<string | null> {
  const { data, error } = await obtenerCliente().storage
    .from(BUCKET)
    .createSignedUrl(ruta, segundos);

  if (error) return null;
  return data?.signedUrl ?? null;
}

export async function registrarPago(datos: {
  dojoId: string;
  alumnoId: string;
  planId: string | null;
  periodo: string;
  monto: number;
  referencia?: string | null;
  comprobanteUrl?: string | null;
}): Promise<void> {
  const { error } = await obtenerCliente().from('pagos').insert({
    dojo_id: datos.dojoId,
    alumno_id: datos.alumnoId,
    plan_id: datos.planId,
    periodo: datos.periodo,
    monto: datos.monto,
    referencia: datos.referencia ?? null,
    comprobante_url: datos.comprobanteUrl ?? null,
    // El estado lo fija la politica RLS: siempre entra como 'pendiente'.
  });
  if (error) throw error;
}

/**
 * Aprueba o rechaza un pago. Quien y cuando verifico lo sella el servidor
 * (trigger `sellar_verificacion`), no el cliente.
 */
export async function verificarPago(
  id: string,
  decision: { aprobar: true } | { aprobar: false; motivo: string },
): Promise<void> {
  const cambios = decision.aprobar
    ? { estado: 'aprobado' as const, motivo_rechazo: null }
    : { estado: 'rechazado' as const, motivo_rechazo: decision.motivo };

  const { error } = await obtenerCliente().from('pagos').update(cambios).eq('id', id);
  if (error) throw error;
}

/** Estado de solvencia derivado del ultimo pago aprobado. */
export async function listarSolvencia(): Promise<Solvencia[]> {
  const { data, error } = await obtenerCliente()
    .from('vista_solvencia')
    .select('alumno_id, dojo_id, nombre, apellido, ultimo_periodo_pagado, cubierto_hasta, solvente, dias_de_atraso')
    .order('solvente')
    .order('apellido');

  if (error) throw error;
  return (data ?? []) as Solvencia[];
}

/** Ingresos aprobados agrupados por periodo, para el reporte del maestro. */
export async function ingresosPorPeriodo(): Promise<{ periodo: string; total: number }[]> {
  const pagos = await listarPagos({ estado: 'aprobado' });
  const totales = new Map<string, number>();

  for (const pago of pagos) {
    totales.set(pago.periodo, (totales.get(pago.periodo) ?? 0) + Number(pago.monto));
  }

  return [...totales.entries()]
    .map(([periodo, total]) => ({ periodo, total }))
    .sort((a, b) => b.periodo.localeCompare(a.periodo));
}
