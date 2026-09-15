import { destinosSecundarios } from '@ossapp/core';
import { useAuth } from '@ossapp/data';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Pantalla } from '../Pantalla';
import { Tarjeta } from '../Tarjeta';
import { Separador } from '../Lista';
import { useEstilos, useTema } from '../TemaProvider';
import { espaciado, radios, type Tema } from '../temas';
import { tipografia } from '../tipografia';

const crearEstilos = (tema: Tema) =>
  StyleSheet.create({
    lista: { padding: 0, overflow: 'hidden' },
    fila: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: espaciado.md,
      padding: espaciado.lg,
    },
    presionada: { backgroundColor: tema.color.superficieAlterna },
    icono: {
      width: 40,
      height: 40,
      borderRadius: radios.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: tema.color.primarioSuave,
    },
    centro: { flex: 1, gap: 2 },
    titulo: { ...tipografia.cuerpo, color: tema.color.texto, fontWeight: '600' },
    descripcion: { ...tipografia.pie, color: tema.color.textoSecundario },
  });

/**
 * Destinos que no caben en la barra de pestanas. El contenido sale de
 * `destinosSecundarios(rol)`, igual que las pestanas salen de `pestanasDe`.
 */
export function PantallaMas() {
  const { perfil } = useAuth();
  const tema = useTema();
  const estilos = useEstilos(crearEstilos);
  const router = useRouter();

  if (!perfil) return null;
  const destinos = destinosSecundarios(perfil.rol);

  return (
    <Pantalla titulo="Mas">
      <Tarjeta style={estilos.lista}>
        {destinos.map((destino, indice) => (
          <View key={destino.ruta}>
            {indice > 0 && <Separador />}
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push(`/${destino.ruta}` as never)}
              style={({ pressed }) => [estilos.fila, pressed && estilos.presionada]}
            >
              <View style={estilos.icono}>
                <Ionicons
                  name={destino.icono as never}
                  size={20}
                  color={tema.color.primario}
                />
              </View>
              <View style={estilos.centro}>
                <Text style={estilos.titulo}>{destino.titulo}</Text>
                <Text style={estilos.descripcion}>{destino.descripcion}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={tema.color.textoTenue} />
            </Pressable>
          </View>
        ))}
      </Tarjeta>
    </Pantalla>
  );
}
