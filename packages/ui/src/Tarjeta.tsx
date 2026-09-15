import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useEstilos } from './TemaProvider';
import { espaciado, radios, type Tema } from './temas';
import { tipografia } from './tipografia';

type Props = {
  titulo?: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

const crearEstilos = (tema: Tema) =>
  StyleSheet.create({
    tarjeta: {
      backgroundColor: tema.color.superficie,
      borderRadius: radios.lg,
      padding: espaciado.lg,
      gap: espaciado.sm,
      // En oscuro la sombra no se ve: el borde es lo que separa la tarjeta del fondo.
      borderWidth: tema.nombre === 'oscuro' ? StyleSheet.hairlineWidth : 0,
      borderColor: tema.color.bordeSuave,
      ...tema.sombra.tarjeta,
    },
    titulo: { ...tipografia.seccion, color: tema.color.texto, marginBottom: espaciado.xs },
  });

export function Tarjeta({ titulo, children, style }: Props) {
  const estilos = useEstilos(crearEstilos);
  return (
    <View style={[estilos.tarjeta, style]}>
      {!!titulo && <Text style={estilos.titulo}>{titulo}</Text>}
      {children}
    </View>
  );
}
