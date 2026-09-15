import { APP_POR_ROL } from '@ossapp/core';
import { AuthProvider, useAuth } from '@ossapp/data';
import { Cargando, TemaProvider, useFuentes, usePush, useTema } from '@ossapp/ui';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

const APP = 'familias' as const;

/**
 * Guard de sesion. Vive en el layout raiz para que valga tanto al abrir la app
 * como al cerrar sesion desde cualquier pantalla.
 */
function Guard({ children }: { children: React.ReactNode }) {
  const { cargando, sesion, perfil } = useAuth();
  const segmentos = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (cargando) return;

    const enZonaPrivada = segmentos[0] === '(app)';
    const autorizado = !!sesion && !!perfil && APP_POR_ROL[perfil.rol] === APP && perfil.activo;

    if (!autorizado && enZonaPrivada) router.replace('/login');
    else if (autorizado && !enZonaPrivada) router.replace('/');
  }, [cargando, sesion, perfil, segmentos, router]);

  if (cargando) return <Cargando mensaje="Comprobando tu sesion..." />;
  return <>{children}</>;
}

function Contenido() {
  const tema = useTema();
  const fuentesListas = useFuentes();
  const { sesion } = useAuth();

  // Se registra el dispositivo en cuanto hay sesion, no antes: el token se
  // guarda asociado al usuario.
  usePush(!!sesion);

  // Sin la fuente cargada el texto saltaria de la del sistema a Cascadia Code
  // en cuanto termine de resolverse.
  if (!fuentesListas) return <Cargando mensaje="Preparando OssApp..." />;

  return (
    <>
      {/* La barra de estado sigue al tema, no al color de marca. */}
      <StatusBar style={tema.nombre === 'oscuro' ? 'light' : 'dark'} />
      <Guard>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(app)" />
        </Stack>
      </Guard>
    </>
  );
}

export default function LayoutRaiz() {
  return (
    <SafeAreaProvider>
      <TemaProvider>
        <AuthProvider>
          <Contenido />
        </AuthProvider>
      </TemaProvider>
    </SafeAreaProvider>
  );
}
