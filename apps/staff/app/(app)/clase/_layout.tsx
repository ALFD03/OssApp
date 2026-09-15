import { tipografia, useTema } from '@ossapp/ui';
import { Stack } from 'expo-router';
import React from 'react';

export default function LayoutClase() {
  const tema = useTema();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: tema.color.superficieMarca },
        headerTintColor: tema.color.textoSobreMarca,
        headerTitleStyle: { ...tipografia.seccion, color: tema.color.textoSobreMarca },
      }}
    >
      <Stack.Screen name="[id]" options={{ title: 'Clase' }} />
    </Stack>
  );
}
