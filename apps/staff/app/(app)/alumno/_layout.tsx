import { Stack } from 'expo-router';
import React from 'react';
import { useTema } from '@ossapp/ui';
import { tipografia } from '@ossapp/ui';

export default function LayoutAlumno() {
  const tema = useTema();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: tema.color.superficieMarca },
        headerTintColor: tema.color.textoSobreMarca,
        headerTitleStyle: { ...tipografia.seccion, color: tema.color.textoSobreMarca },
      }}
    >
      <Stack.Screen name="nuevo" options={{ title: 'Nuevo alumno' }} />
      <Stack.Screen name="[id]" options={{ title: 'Ficha del alumno' }} />
    </Stack>
  );
}
