import React from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { useEstilos, useTema } from './TemaProvider';
import { espaciado, radios, type Tema } from './temas';
import { tipografia } from './tipografia';

type Props = TextInputProps & {
  etiqueta: string;
  error?: string | null;
};

const crearEstilos = (tema: Tema) =>
  StyleSheet.create({
    contenedor: { gap: espaciado.xs, marginBottom: espaciado.lg },
    etiqueta: {
      ...tipografia.etiqueta,
      color: tema.color.textoSecundario,
      letterSpacing: 0.4,
    },
    input: {
      minHeight: 48,
      borderWidth: 1,
      borderColor: tema.color.borde,
      borderRadius: radios.md,
      paddingHorizontal: espaciado.lg,
      backgroundColor: tema.color.superficie,
      color: tema.color.texto,
      ...tipografia.cuerpo,
    },
    inputError: { borderColor: tema.color.peligro },
    error: { ...tipografia.pie, color: tema.color.peligro },
  });

export function Campo({ etiqueta, error, style, ...props }: Props) {
  const tema = useTema();
  const estilos = useEstilos(crearEstilos);

  return (
    <View style={estilos.contenedor}>
      <Text style={estilos.etiqueta}>{etiqueta}</Text>
      <TextInput
        accessibilityLabel={etiqueta}
        placeholderTextColor={tema.color.textoTenue}
        // En tema oscuro el teclado nativo debe ir oscuro tambien.
        keyboardAppearance={tema.esquema}
        style={[estilos.input, !!error && estilos.inputError, style]}
        {...props}
      />
      {!!error && <Text style={estilos.error}>{error}</Text>}
    </View>
  );
}
