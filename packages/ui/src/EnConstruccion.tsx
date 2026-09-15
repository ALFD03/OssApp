import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useEstilos } from './TemaProvider';
import { espaciado, radios, type Tema } from './temas';
import { tipografia } from './tipografia';

const crearEstilos = (tema: Tema) =>
  StyleSheet.create({
    caja: {
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: tema.color.borde,
      borderRadius: radios.lg,
      padding: espaciado.xl,
      gap: espaciado.sm,
      backgroundColor: tema.color.superficieAlterna,
    },
    fase: { ...tipografia.etiqueta, color: tema.color.acento, letterSpacing: 0.6 },
    detalle: { ...tipografia.cuerpo, color: tema.color.textoSecundario },
  });

/**
 * Marcador para las pantallas cuyo contenido llega en una fase posterior del plan.
 * Deja explicito en la propia app que fase la completa.
 */
export function EnConstruccion({ fase, detalle }: { fase: string; detalle: string }) {
  const estilos = useEstilos(crearEstilos);
  return (
    <View style={estilos.caja}>
      <Text style={estilos.fase}>{fase}</Text>
      <Text style={estilos.detalle}>{detalle}</Text>
    </View>
  );
}
