import { almacenamientoSeguro } from '@ossapp/data';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { temaClaro, temaOscuro, type Tema } from './temas';

export type PreferenciaTema = 'sistema' | 'claro' | 'oscuro';

const CLAVE = 'ossapp.preferencia_tema';

type EstadoTema = {
  tema: Tema;
  preferencia: PreferenciaTema;
  cambiarPreferencia: (preferencia: PreferenciaTema) => void;
};

const Contexto = createContext<EstadoTema | null>(null);

export function TemaProvider({ children }: { children: React.ReactNode }) {
  const esquemaSistema = useColorScheme();
  const [preferencia, setPreferencia] = useState<PreferenciaTema>('sistema');

  // La preferencia se lee de forma diferida: hasta que llega, se sigue al
  // sistema. Evita un parpadeo de tema al abrir la app.
  useEffect(() => {
    let vigente = true;
    void almacenamientoSeguro
      .getItem(CLAVE)
      .then((valor) => {
        if (!vigente) return;
        if (valor === 'claro' || valor === 'oscuro' || valor === 'sistema') setPreferencia(valor);
      })
      .catch(() => {
        // Si el almacen falla, el tema del sistema es un buen valor por defecto.
      });
    return () => {
      vigente = false;
    };
  }, []);

  const cambiarPreferencia = useCallback((nueva: PreferenciaTema) => {
    setPreferencia(nueva);
    void almacenamientoSeguro.setItem(CLAVE, nueva).catch(() => {});
  }, []);

  const valor = useMemo<EstadoTema>(() => {
    const efectivo = preferencia === 'sistema' ? (esquemaSistema ?? 'light') : preferencia;
    const tema = efectivo === 'dark' || efectivo === 'oscuro' ? temaOscuro : temaClaro;
    return { tema, preferencia, cambiarPreferencia };
  }, [preferencia, esquemaSistema, cambiarPreferencia]);

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useTema(): Tema {
  return useContextoTema().tema;
}

export function useContextoTema(): EstadoTema {
  const contexto = useContext(Contexto);
  if (!contexto) throw new Error('useTema debe usarse dentro de <TemaProvider>.');
  return contexto;
}

/**
 * Crea hojas de estilo dependientes del tema sin recalcularlas en cada render.
 *
 *   const estilos = useEstilos(crearEstilos);
 */
export function useEstilos<T>(crear: (tema: Tema) => T): T {
  const tema = useTema();
  return useMemo(() => crear(tema), [tema, crear]);
}
