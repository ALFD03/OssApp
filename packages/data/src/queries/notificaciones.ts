import type { Notificacion } from '@ossapp/core';
import { obtenerCliente } from '../client';

const CAMPOS = 'id, dojo_id, usuario_id, tipo, titulo, cuerpo, datos, leida, creado_el';

/** Solo llegan las propias: la politica RLS filtra por usuario. */
export async function listarNotificaciones(soloNoLeidas = false): Promise<Notificacion[]> {
  let consulta = obtenerCliente()
    .from('notificaciones')
    .select(CAMPOS)
    .order('creado_el', { ascending: false })
    .limit(100);

  if (soloNoLeidas) consulta = consulta.eq('leida', false);

  const { data, error } = await consulta;
  if (error) throw error;
  return (data ?? []) as unknown as Notificacion[];
}

export async function contarNoLeidas(): Promise<number> {
  const { count, error } = await obtenerCliente()
    .from('notificaciones')
    .select('id', { count: 'exact', head: true })
    .eq('leida', false);

  if (error) throw error;
  return count ?? 0;
}

export async function marcarLeida(id: string): Promise<void> {
  const { error } = await obtenerCliente().from('notificaciones').update({ leida: true }).eq('id', id);
  if (error) throw error;
}

export async function marcarTodasLeidas(): Promise<void> {
  const cliente = obtenerCliente();
  const { data } = await cliente.auth.getUser();
  if (!data.user) return;

  const { error } = await cliente
    .from('notificaciones')
    .update({ leida: true })
    .eq('usuario_id', data.user.id)
    .eq('leida', false);

  if (error) throw error;
}

/**
 * Registra el token de push del dispositivo.
 *
 * upsert por `push_token`: al reinstalar, Expo puede devolver el mismo token y
 * no debe crear una fila duplicada.
 */
export async function registrarDispositivo(
  pushToken: string,
  plataforma: 'ios' | 'android' | 'web',
): Promise<void> {
  const cliente = obtenerCliente();
  const { data } = await cliente.auth.getUser();
  if (!data.user) return;

  const { error } = await cliente.from('dispositivos').upsert(
    {
      usuario_id: data.user.id,
      push_token: pushToken,
      plataforma,
      usado_el: new Date().toISOString(),
    },
    { onConflict: 'push_token' },
  );

  if (error) throw error;
}
