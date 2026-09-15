import { Ionicons } from '@expo/vector-icons';
import { pestanasDe, type Rol } from '@ossapp/core';
import { Tabs } from 'expo-router';
import React from 'react';
import { useTema } from '../TemaProvider';
import { tipografia } from '../tipografia';

type Props = {
  rol: Rol;
  /** Todas las rutas que declara la app (rutasDeApp de @ossapp/core). */
  rutas: readonly string[];
};

/**
 * Pestanas derivadas del rol. Las rutas que no corresponden al rol se declaran
 * igualmente pero con href={null}: expo-router necesita conocerlas y asi quedan
 * fuera de la barra y sin enlace directo.
 */
export function TabsPorRol({ rol, rutas }: Props) {
  const tema = useTema();
  const pestanas = pestanasDe(rol);
  const visibles = new Map(pestanas.map((p) => [p.ruta, p]));

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: tema.color.primario,
        tabBarInactiveTintColor: tema.color.textoTenue,
        tabBarLabelStyle: tipografia.etiqueta,
        tabBarStyle: {
          backgroundColor: tema.color.superficie,
          borderTopColor: tema.color.borde,
        },
        headerStyle: { backgroundColor: tema.color.superficieMarca },
        headerTintColor: tema.color.textoSobreMarca,
        headerTitleStyle: { ...tipografia.seccion, color: tema.color.textoSobreMarca },
      }}
    >
      {/* El orden de las pestanas visibles manda; el resto va detras, oculto. */}
      {[...pestanas.map((p) => p.ruta), ...rutas.filter((r) => !visibles.has(r))].map((ruta) => {
        const pestana = visibles.get(ruta);
        return (
          <Tabs.Screen
            key={ruta}
            name={ruta}
            options={
              pestana
                ? {
                    title: pestana.titulo,
                    tabBarIcon: ({ color, size }) => (
                      <Ionicons
                        name={pestana.icono as never}
                        color={typeof color === 'number' ? undefined : (color ?? undefined)}
                        size={size}
                      />
                    ),
                  }
                : { href: null }
            }
          />
        );
      })}
    </Tabs>
  );
}
