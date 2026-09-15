import React, { useCallback } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useEstilos, useTema } from './TemaProvider';
import { espaciado, radios, type Tema } from './temas';
import { tipografia } from './tipografia';

type Props = {
  titulo: string;
  onPress: () => void;
  variante?: 'primario' | 'secundario' | 'texto';
  /** Color de accion. Por defecto el primario del tema. */
  color?: string;
  cargando?: boolean;
  deshabilitado?: boolean;
  style?: StyleProp<ViewStyle>;
};

const crearEstilos = (tema: Tema) =>
  StyleSheet.create({
    base: {
      minHeight: 48,
      paddingHorizontal: espaciado.xl,
      borderRadius: radios.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    secundario: { borderWidth: 1, backgroundColor: 'transparent' },
    texto: { paddingHorizontal: espaciado.sm, minHeight: 40 },
    etiqueta: { ...tipografia.seccion },
    sobreRelleno: { color: tema.color.textoSobreMarca },
    inactivo: { opacity: 0.5 },
    presionado: { opacity: 0.85 },
  });

export function Boton({
  titulo,
  onPress,
  variante = 'primario',
  color,
  cargando = false,
  deshabilitado = false,
  style,
}: Props) {
  const tema = useTema();
  const estilos = useEstilos(crearEstilos);
  const colorAccion = color ?? tema.color.primario;
  const inactivo = deshabilitado || cargando;
  const esPrimario = variante === 'primario';

  const estiloContenedor = useCallback(
    ({ pressed }: { pressed: boolean }) => [
      estilos.base,
      esPrimario && { backgroundColor: colorAccion },
      variante === 'secundario' && [estilos.secundario, { borderColor: colorAccion }],
      variante === 'texto' && estilos.texto,
      inactivo && estilos.inactivo,
      pressed && !inactivo && estilos.presionado,
      style,
    ],
    [estilos, esPrimario, colorAccion, variante, inactivo, style],
  );

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactivo, busy: cargando }}
      onPress={onPress}
      disabled={inactivo}
      style={estiloContenedor}
    >
      {cargando ? (
        <ActivityIndicator color={esPrimario ? tema.color.textoSobreMarca : colorAccion} />
      ) : (
        <Text
          style={[estilos.etiqueta, esPrimario ? estilos.sobreRelleno : { color: colorAccion }]}
        >
          {titulo}
        </Text>
      )}
    </Pressable>
  );
}
