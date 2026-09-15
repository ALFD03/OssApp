import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useEstilos, useTema } from './TemaProvider';
import { espaciado, radios, type Tema } from './temas';
import { tipografia } from './tipografia';

const crearEstilos = (tema: Tema) =>
  StyleSheet.create({
    boton: {
      position: 'absolute',
      right: espaciado.lg,
      bottom: espaciado.xl,
      flexDirection: 'row',
      alignItems: 'center',
      gap: espaciado.sm,
      paddingVertical: espaciado.md,
      paddingHorizontal: espaciado.xl,
      borderRadius: radios.pill,
      backgroundColor: tema.color.primario,
      ...tema.sombra.tarjeta,
      shadowOpacity: 0.25,
      elevation: 6,
    },
    presionado: { opacity: 0.88 },
    texto: { ...tipografia.seccion, color: tema.color.textoSobreMarca },
  });

export function BotonFlotante({
  titulo,
  icono = 'add',
  onPress,
}: {
  titulo: string;
  icono?: string;
  onPress: () => void;
}) {
  const tema = useTema();
  const estilos = useEstilos(crearEstilos);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={titulo}
      onPress={onPress}
      style={({ pressed }) => [estilos.boton, pressed && estilos.presionado]}
    >
      <Ionicons name={icono as never} size={20} color={tema.color.textoSobreMarca} />
      <Text style={estilos.texto}>{titulo}</Text>
    </Pressable>
  );
}
