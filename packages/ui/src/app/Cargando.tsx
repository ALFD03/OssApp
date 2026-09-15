import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useEstilos, useTema } from '../TemaProvider';
import { espaciado, type Tema } from '../temas';

const crearEstilos = (tema: Tema) =>
  StyleSheet.create({
    contenedor: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: espaciado.md,
      backgroundColor: tema.color.fondo,
    },
    // Sin tipografia del sistema de diseno a proposito: esta pantalla se pinta
    // tambien mientras Cascadia Code aun no esta cargada.
    mensaje: { fontSize: 14, color: tema.color.textoSecundario },
  });

export function Cargando({ mensaje = 'Cargando...' }: { mensaje?: string }) {
  const tema = useTema();
  const estilos = useEstilos(crearEstilos);

  return (
    <View style={estilos.contenedor}>
      <ActivityIndicator size="large" color={tema.color.primario} />
      <Text style={estilos.mensaje}>{mensaje}</Text>
    </View>
  );
}
