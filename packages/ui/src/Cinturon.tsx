import { textoSobreCinturon } from '@ossapp/core';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useEstilos } from './TemaProvider';
import { espaciado, radios, type Tema } from './temas';
import { tipografia } from './tipografia';

const crearEstilos = (tema: Tema) =>
  StyleSheet.create({
    cinta: {
      paddingVertical: espaciado.sm,
      paddingHorizontal: espaciado.lg,
      borderRadius: radios.sm,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: tema.color.borde,
      alignSelf: 'flex-start',
    },
    nombre: { ...tipografia.seccion },
  });

/** Cinta con el color real del cinturon y texto legible encima. */
export function Cinturon({ nombre, color }: { nombre: string; color: string }) {
  const estilos = useEstilos(crearEstilos);

  return (
    <View style={[estilos.cinta, { backgroundColor: color }]}>
      <Text style={[estilos.nombre, { color: textoSobreCinturon(color) }]}>{nombre}</Text>
    </View>
  );
}
