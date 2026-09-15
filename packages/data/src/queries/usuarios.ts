import type { Rol, Usuario } from '@ossapp/core';
import { obtenerCliente } from '../client';

const CAMPOS = 'id, dojo_id, rol, nombre, apellido, email, telefono, activo, creado_el, actualizado_el';

/**
 * Usuarios visibles para el usuario autenticado. RLS los acota a su dojo;
 * `rol` es solo un filtro de conveniencia para la UI.
 */
export async function listarUsuarios(rol?: Rol): Promise<Usuario[]> {
  let consulta = obtenerCliente().from('usuarios').select(CAMPOS).order('apellido');
  if (rol) consulta = consulta.eq('rol', rol);

  const { data, error } = await consulta;
  if (error) throw error;
  return (data ?? []) as Usuario[];
}

export async function contarUsuariosPorRol(): Promise<Record<string, number>> {
  const usuarios = await listarUsuarios();
  return usuarios.reduce<Record<string, number>>((acc, usuario) => {
    acc[usuario.rol] = (acc[usuario.rol] ?? 0) + 1;
    return acc;
  }, {});
}

export async function actualizarPerfilPropio(
  cambios: Partial<Pick<Usuario, 'nombre' | 'apellido' | 'telefono'>>,
): Promise<void> {
  const cliente = obtenerCliente();
  const { data } = await cliente.auth.getUser();
  if (!data.user) throw new Error('No hay sesion activa.');

  const { error } = await cliente.from('usuarios').update(cambios).eq('id', data.user.id);
  if (error) throw error;
}
