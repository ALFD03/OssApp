import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useEstilos, useTema } from './TemaProvider';
import { espaciado, radios, type Tema } from './temas';
import { tipografia } from './tipografia';

const crearEstilos = (tema: Tema) =>
  StyleSheet.create({
    contenedor: { gap: espaciado.xs },
    cabecera: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    etiqueta: { ...tipografia.pie, color: tema.color.textoSecundario },
    valor: { ...tipografia.pie, color: tema.color.texto },
    pista: {
      height: 8,
      borderRadius: radios.pill,
      backgroundColor: tema.color.superficieAlterna,
      overflow: 'hidden',
    },
    relleno: { height: 8, borderRadius: radios.pill },
  });

/**
 * Barra de progreso hacia un requisito. `avance` va de 0 a 1.
 * Se pinta en verde al completarse para que el "ya cumplido" se vea de un vistazo.
 */
export function Progreso({
  etiqueta,
  avance,
  detalle,
}: {
  etiqueta: string;
  avance: number;
  detalle?: string;
}) {
  const tema = useTema();
  const estilos = useEstilos(crearEstilos);
  const proporcion = Math.max(0, Math.min(avance, 1));
  const completo = proporcion >= 1;

  return (
    <View
      style={estilos.contenedor}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(proporcion * 100) }}
      accessibilityLabel={etiqueta}
    >
      <View style={estilos.cabecera}>
        <Text style={estilos.etiqueta}>{etiqueta}</Text>
        {!!detalle && <Text style={estilos.valor}>{detalle}</Text>}
      </View>
      <View style={estilos.pista}>
        <View
          style={[
            estilos.relleno,
            {
              width: `${proporcion * 100}%`,
              backgroundColor: completo ? tema.color.exito : tema.color.primario,
            },
          ]}
        />
      </View>
    </View>
  );
}
