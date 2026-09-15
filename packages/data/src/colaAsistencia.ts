import AsyncStorage from '@react-native-async-storage/async-storage';
import { obtenerCliente } from './client';

const CLAVE = 'ossapp.cola_asistencia';

export type MarcaPendiente = {
  /** Generado en el dispositivo ANTES de intentar enviar: es la clave de idempotencia. */
  client_id: string;
  dojo_id: string;
  clase_id: string;
  alumno_id: string;
  fecha: string;
  creado_el: string;
};

/**
 * Cola de asistencias marcadas sin conexion.
 *
 * Vive en AsyncStorage y no en SecureStore: la cola puede crecer mas alla del
 * limite por entrada de SecureStore en Android, y no contiene secretos.
 *
 * El servidor deduplica por `client_id` y por (alumno, clase, fecha), asi que
 * reenviar una marca ya aplicada es inofensivo. Por eso la cola puede reintentar
 * sin llevar cuenta de que llego y que no.
 */
async function leer(): Promise<MarcaPendiente[]> {
  try {
    const crudo = await AsyncStorage.getItem(CLAVE);
    return crudo ? (JSON.parse(crudo) as MarcaPendiente[]) : [];
  } catch {
    return [];
  }
}

async function escribir(marcas: MarcaPendiente[]): Promise<void> {
  try {
    await AsyncStorage.setItem(CLAVE, JSON.stringify(marcas));
  } catch {
    // Si el almacen falla no hay mucho que hacer: se pierde la cola, pero la
    // app no debe romperse por ello.
  }
}

export async function encolarAsistencia(marca: Omit<MarcaPendiente, 'creado_el'>): Promise<void> {
  const cola = await leer();

  // No se encola dos veces la misma marca del mismo dia.
  if (cola.some((m) => m.alumno_id === marca.alumno_id && m.clase_id === marca.clase_id && m.fecha === marca.fecha)) {
    return;
  }

  cola.push({ ...marca, creado_el: new Date().toISOString() });
  await escribir(cola);
}

export async function contarPendientes(): Promise<number> {
  return (await leer()).length;
}

export type ResultadoSincronizacion = {
  enviadas: number;
  pendientes: number;
};

/**
 * Intenta enviar la cola. Lo que falla por red se conserva; lo que falla porque
 * ya existe (clave duplicada) se descarta, porque ya esta aplicado.
 */
export async function sincronizarAsistencias(): Promise<ResultadoSincronizacion> {
  const cola = await leer();
  if (cola.length === 0) return { enviadas: 0, pendientes: 0 };

  const cliente = obtenerCliente();
  const quedan: MarcaPendiente[] = [];
  let enviadas = 0;

  for (const marca of cola) {
    const { error } = await cliente.from('asistencias').insert({
      dojo_id: marca.dojo_id,
      clase_id: marca.clase_id,
      alumno_id: marca.alumno_id,
      fecha: marca.fecha,
      origen: 'manual',
      client_id: marca.client_id,
    });

    if (!error || error.code === '23505') {
      // 23505 = ya estaba registrada. Cuenta como aplicada.
      enviadas += 1;
      continue;
    }

    if (error.code === '42501') {
      // Sin permiso: reintentarlo eternamente no lo va a arreglar.
      continue;
    }

    quedan.push(marca);
  }

  await escribir(quedan);
  return { enviadas, pendientes: quedan.length };
}

export async function vaciarCola(): Promise<void> {
  await escribir([]);
}
