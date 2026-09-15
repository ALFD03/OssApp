import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useEstilos, useTema } from './TemaProvider';
import { espaciado, radios, type Tema } from './temas';
import { tipografia } from './tipografia';

const crearEstilos = (tema: Tema) =>
  StyleSheet.create({
    fila: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: espaciado.md,
      paddingVertical: espaciado.md,
      paddingHorizontal: espaciado.lg,
      backgroundColor: tema.color.superficie,
    },
    filaPresionada: { backgroundColor: tema.color.superficieAlterna },
    avatar: {
      width: 40,
      height: 40,
      borderRadius: radios.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: tema.color.primarioSuave,
    },
    inicial: { ...tipografia.seccion, color: tema.color.primario },
    centro: { flex: 1, gap: 2 },
    titulo: { ...tipografia.cuerpo, color: tema.color.texto, fontWeight: '600' },
    detalle: { ...tipografia.pie, color: tema.color.textoSecundario },
    separador: { height: StyleSheet.hairlineWidth, backgroundColor: tema.color.borde },
    vacio: {
      alignItems: 'center',
      gap: espaciado.sm,
      paddingVertical: espaciado.xxl,
      paddingHorizontal: espaciado.lg,
    },
    vacioTitulo: { ...tipografia.seccion, color: tema.color.texto, textAlign: 'center' },
    vacioDetalle: {
      ...tipografia.cuerpo,
      color: tema.color.textoSecundario,
      textAlign: 'center',
    },
  });

export function Separador() {
  const estilos = useEstilos(crearEstilos);
  return <View style={estilos.separador} />;
}

type FilaProps = {
  titulo: string;
  detalle?: string;
  /** Inicial del avatar. Si se omite, se toma la del titulo. */
  inicial?: string;
  derecha?: React.ReactNode;
  onPress?: () => void;
};

/** Fila estandar de listado: avatar con inicial, titulo, detalle y contenido a la derecha. */
export function Fila({ titulo, detalle, inicial, derecha, onPress }: FilaProps) {
  const tema = useTema();
  const estilos = useEstilos(crearEstilos);
  const letra = (inicial ?? titulo).trim().charAt(0).toUpperCase() || '?';

  const contenido = (
    <>
      <View style={estilos.avatar}>
        <Text style={estilos.inicial}>{letra}</Text>
      </View>
      <View style={estilos.centro}>
        <Text style={estilos.titulo} numberOfLines={1}>
          {titulo}
        </Text>
        {!!detalle && (
          <Text style={estilos.detalle} numberOfLines={2}>
            {detalle}
          </Text>
        )}
      </View>
      {derecha}
      {!!onPress && (
        <Ionicons name="chevron-forward" size={18} color={tema.color.textoTenue} />
      )}
    </>
  );

  if (!onPress) return <View style={estilos.fila}>{contenido}</View>;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [estilos.fila, pressed && estilos.filaPresionada]}
    >
      {contenido}
    </Pressable>
  );
}

/** Estado vacio de un listado. Siempre dice que hacer, no solo que no hay nada. */
export function EstadoVacio({
  icono = 'file-tray-outline',
  titulo,
  detalle,
}: {
  icono?: string;
  titulo: string;
  detalle?: string;
}) {
  const tema = useTema();
  const estilos = useEstilos(crearEstilos);

  return (
    <View style={estilos.vacio}>
      <Ionicons name={icono as never} size={40} color={tema.color.textoTenue} />
      <Text style={estilos.vacioTitulo}>{titulo}</Text>
      {!!detalle && <Text style={estilos.vacioDetalle}>{detalle}</Text>}
    </View>
  );
}
