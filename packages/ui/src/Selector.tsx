import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useEstilos } from './TemaProvider';
import { espaciado, radios, type Tema } from './temas';
import { tipografia } from './tipografia';

export type Opcion<T extends string> = { valor: T; etiqueta: string };

type Props<T extends string> = {
  etiqueta?: string;
  opciones: readonly Opcion<T>[];
  valor: T | null;
  onCambiar: (valor: T) => void;
  /** Si hay muchas opciones, se desplazan en horizontal en vez de envolverse. */
  desplazable?: boolean;
};

const crearEstilos = (tema: Tema) =>
  StyleSheet.create({
    contenedor: { gap: espaciado.sm, marginBottom: espaciado.lg },
    etiqueta: { ...tipografia.etiqueta, color: tema.color.textoSecundario, letterSpacing: 0.4 },
    grupo: { flexDirection: 'row', flexWrap: 'wrap', gap: espaciado.sm },
    grupoDesplazable: { flexDirection: 'row', gap: espaciado.sm, paddingRight: espaciado.lg },
    opcion: {
      paddingVertical: espaciado.sm,
      paddingHorizontal: espaciado.lg,
      borderRadius: radios.pill,
      borderWidth: 1,
      borderColor: tema.color.borde,
      backgroundColor: tema.color.superficie,
    },
    opcionActiva: { backgroundColor: tema.color.primario, borderColor: tema.color.primario },
    texto: { ...tipografia.pie, color: tema.color.textoSecundario, fontWeight: '600' },
    textoActivo: { color: tema.color.textoSobreMarca },
  });

/** Grupo de opciones excluyentes en forma de chips. Evita pickers nativos. */
export function Selector<T extends string>({
  etiqueta,
  opciones,
  valor,
  onCambiar,
  desplazable = false,
}: Props<T>) {
  const estilos = useEstilos(crearEstilos);

  const chips = opciones.map((opcion) => {
    const activa = opcion.valor === valor;
    return (
      <Pressable
        key={opcion.valor}
        accessibilityRole="radio"
        accessibilityState={{ selected: activa }}
        onPress={() => onCambiar(opcion.valor)}
        style={[estilos.opcion, activa && estilos.opcionActiva]}
      >
        <Text style={[estilos.texto, activa && estilos.textoActivo]}>{opcion.etiqueta}</Text>
      </Pressable>
    );
  });

  return (
    <View style={estilos.contenedor}>
      {!!etiqueta && <Text style={estilos.etiqueta}>{etiqueta}</Text>}
      {desplazable ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={estilos.grupoDesplazable}>{chips}</View>
        </ScrollView>
      ) : (
        <View style={estilos.grupo} accessibilityRole="radiogroup">
          {chips}
        </View>
      )}
    </View>
  );
}
