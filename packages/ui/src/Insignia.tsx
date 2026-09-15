import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useEstilos, useTema } from './TemaProvider';
import { espaciado, radios, type Tema } from './temas';
import { tipografia } from './tipografia';

export type TonoInsignia = 'neutro' | 'exito' | 'advertencia' | 'peligro' | 'info' | 'acento';

function tonos(tema: Tema): Record<TonoInsignia, { fondo: string; texto: string }> {
  return {
    neutro: { fondo: tema.color.superficieAlterna, texto: tema.color.textoSecundario },
    exito: { fondo: tema.color.exitoSuave, texto: tema.color.exito },
    advertencia: { fondo: tema.color.advertenciaSuave, texto: tema.color.advertencia },
    peligro: { fondo: tema.color.peligroSuave, texto: tema.color.peligro },
    info: { fondo: tema.color.infoSuave, texto: tema.color.info },
    acento: { fondo: tema.color.acentoSuave, texto: tema.color.acento },
  };
}

const crearEstilos = () =>
  StyleSheet.create({
    insignia: {
      alignSelf: 'flex-start',
      paddingHorizontal: espaciado.md,
      paddingVertical: espaciado.xs,
      borderRadius: radios.pill,
    },
    etiqueta: { ...tipografia.etiqueta, letterSpacing: 0.6 },
  });

export function Insignia({ texto, tono = 'neutro' }: { texto: string; tono?: TonoInsignia }) {
  const tema = useTema();
  const estilos = useEstilos(crearEstilos);
  const { fondo, texto: colorTexto } = tonos(tema)[tono];

  return (
    <View style={[estilos.insignia, { backgroundColor: fondo }]}>
      <Text style={[estilos.etiqueta, { color: colorTexto }]}>{texto.toUpperCase()}</Text>
    </View>
  );
}
