import { APP_POR_ROL, esRol, type Perfil, type Rol } from '@ossapp/core';
import type { Session } from '@supabase/supabase-js';
import { obtenerCliente } from './client';

export type ResultadoLogin =
  | { ok: true; perfil: Perfil }
  | { ok: false; motivo: 'credenciales' | 'app_incorrecta' | 'inactivo' | 'sin_perfil' | 'error'; mensaje: string };

export async function obtenerSesion(): Promise<Session | null> {
  const { data } = await obtenerCliente().auth.getSession();
  return data.session;
}

export function onCambioDeSesion(callback: (sesion: Session | null) => void): () => void {
  const { data } = obtenerCliente().auth.onAuthStateChange((_evento, sesion) => callback(sesion));
  return () => data.subscription.unsubscribe();
}

/**
 * Perfil del usuario autenticado con su dojo resuelto.
 * No filtra por dojo_id: las politicas RLS ya limitan lo que esta fila puede leer.
 */
export async function obtenerPerfil(): Promise<Perfil | null> {
  const cliente = obtenerCliente();
  const { data: sesion } = await cliente.auth.getUser();
  if (!sesion.user) return null;

  const { data, error } = await cliente
    .from('usuarios')
    .select(
      'id, dojo_id, rol, nombre, apellido, email, telefono, activo, creado_el, actualizado_el, dojo:dojos(id, nombre, slug, estado_licencia)',
    )
    .eq('id', sesion.user.id)
    .maybeSingle();

  if (error) throw error;
  if (!data || !esRol(data.rol)) return null;

  return { ...data, rol: data.rol as Rol } as Perfil;
}

/**
 * Inicia sesion y comprueba que el rol corresponde a esta app.
 * Si no corresponde cierra la sesion: no se deja al usuario en un limbo autenticado.
 */
export async function iniciarSesion(
  email: string,
  password: string,
  app: 'staff' | 'familias',
): Promise<ResultadoLogin> {
  const cliente = obtenerCliente();
  const { error } = await cliente.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });

  if (error) {
    return {
      ok: false,
      motivo: 'credenciales',
      mensaje: 'Correo o contrasena incorrectos.',
    };
  }

  let perfil: Perfil | null;
  try {
    perfil = await obtenerPerfil();
  } catch {
    await cliente.auth.signOut();
    return { ok: false, motivo: 'error', mensaje: 'No se pudo cargar tu perfil. Intenta de nuevo.' };
  }

  if (!perfil) {
    await cliente.auth.signOut();
    return {
      ok: false,
      motivo: 'sin_perfil',
      mensaje: 'Tu cuenta no tiene perfil asignado. Contacta al administrador de tu dojo.',
    };
  }

  if (!perfil.activo) {
    await cliente.auth.signOut();
    return { ok: false, motivo: 'inactivo', mensaje: 'Tu cuenta esta desactivada.' };
  }

  if (APP_POR_ROL[perfil.rol] !== app) {
    await cliente.auth.signOut();
    const correcta = app === 'staff' ? 'OssApp Familias' : 'OssApp Staff';
    return {
      ok: false,
      motivo: 'app_incorrecta',
      mensaje: `Tu cuenta es de tipo "${perfil.rol}". Inicia sesion desde ${correcta}.`,
    };
  }

  return { ok: true, perfil };
}

export async function cerrarSesion(): Promise<void> {
  await obtenerCliente().auth.signOut();
}
