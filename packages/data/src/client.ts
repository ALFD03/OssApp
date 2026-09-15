import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';
import { almacenamientoSeguro } from './almacenamiento';
import type { Database } from './types/database';

export type ClienteOssApp = SupabaseClient<Database>;

let cliente: ClienteOssApp | null = null;

function leerEntorno(): { url: string; anonKey: string } {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      'Faltan EXPO_PUBLIC_SUPABASE_URL o EXPO_PUBLIC_SUPABASE_ANON_KEY. ' +
        'Copia .env.example a .env en la raiz de la app y reinicia el servidor de Expo.',
    );
  }
  return { url, anonKey };
}

/** Cliente unico de la app. Todo acceso a datos pasa por aqui. */
export function obtenerCliente(): ClienteOssApp {
  if (cliente) return cliente;

  const { url, anonKey } = leerEntorno();
  cliente = createClient<Database>(url, anonKey, {
    auth: {
      storage: almacenamientoSeguro,
      autoRefreshToken: true,
      persistSession: true,
      // En React Native no hay callback por URL, asi que no hay que leer el hash.
      detectSessionInUrl: false,
    },
  });

  // Supabase solo refresca el token mientras la app esta en primer plano.
  AppState.addEventListener('change', (estado) => {
    if (estado === 'active') void cliente?.auth.startAutoRefresh();
    else void cliente?.auth.stopAutoRefresh();
  });

  return cliente;
}
