import type { Perfil } from '@ossapp/core';
import type { Session } from '@supabase/supabase-js';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { cerrarSesion, obtenerPerfil, onCambioDeSesion, obtenerSesion } from './auth';

type EstadoAuth = {
  /** true mientras se resuelve la sesion inicial; evita parpadeos de navegacion. */
  cargando: boolean;
  sesion: Session | null;
  perfil: Perfil | null;
  error: string | null;
  recargarPerfil: () => Promise<void>;
  salir: () => Promise<void>;
};

const Contexto = createContext<EstadoAuth | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [cargando, setCargando] = useState(true);
  const [sesion, setSesion] = useState<Session | null>(null);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargarPerfil = useCallback(async (sesionActual: Session | null) => {
    if (!sesionActual) {
      setPerfil(null);
      setError(null);
      return;
    }
    try {
      setPerfil(await obtenerPerfil());
      setError(null);
    } catch (e) {
      setPerfil(null);
      setError(e instanceof Error ? e.message : 'No se pudo cargar el perfil.');
    }
  }, []);

  useEffect(() => {
    let vigente = true;

    void (async () => {
      try {
        const inicial = await obtenerSesion();
        if (!vigente) return;
        setSesion(inicial);
        await cargarPerfil(inicial);
      } catch (e) {
        if (vigente) setError(e instanceof Error ? e.message : 'Error de conexion.');
      } finally {
        if (vigente) setCargando(false);
      }
    })();

    const desuscribir = onCambioDeSesion((nueva) => {
      setSesion(nueva);
      void cargarPerfil(nueva);
    });

    return () => {
      vigente = false;
      desuscribir();
    };
  }, [cargarPerfil]);

  const valor = useMemo<EstadoAuth>(
    () => ({
      cargando,
      sesion,
      perfil,
      error,
      recargarPerfil: () => cargarPerfil(sesion),
      salir: async () => {
        await cerrarSesion();
        setPerfil(null);
        setSesion(null);
      },
    }),
    [cargando, sesion, perfil, error, cargarPerfil],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useAuth(): EstadoAuth {
  const contexto = useContext(Contexto);
  if (!contexto) throw new Error('useAuth debe usarse dentro de <AuthProvider>.');
  return contexto;
}
