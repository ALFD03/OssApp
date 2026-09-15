import React from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEstilos, useTema } from './TemaProvider';
import { espaciado, type Tema } from './temas';
import { tipografia } from './tipografia';

type Props = {
  titulo?: string;
  descripcion?: string;
  children?: React.ReactNode;
  desplazable?: boolean;
  /** Si se pasa, habilita "tirar para refrescar". */
  onRefrescar?: () => void;
  refrescando?: boolean;
};

const crearEstilos = (tema: Tema) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: tema.color.fondo },
    contenido: { padding: espaciado.lg, gap: espaciado.lg, flexGrow: 1 },
    titulo: { ...tipografia.titulo, color: tema.color.texto },
    descripcion: {
      ...tipografia.cuerpo,
      color: tema.color.textoSecundario,
      marginTop: -espaciado.sm,
    },
  });

/** Contenedor base de pantalla: margenes, fondo y cabecera consistentes en ambas apps. */
export function Pantalla({
  titulo,
  descripcion,
  children,
  desplazable = true,
  onRefrescar,
  refrescando = false,
}: Props) {
  const tema = useTema();
  const estilos = useEstilos(crearEstilos);

  const contenido = (
    <>
      {!!titulo && <Text style={estilos.titulo}>{titulo}</Text>}
      {!!descripcion && <Text style={estilos.descripcion}>{descripcion}</Text>}
      {children}
    </>
  );

  return (
    <SafeAreaView style={estilos.safe} edges={['top']}>
      {desplazable ? (
        <ScrollView
          contentContainerStyle={estilos.contenido}
          refreshControl={
            onRefrescar ? (
              <RefreshControl
                refreshing={refrescando}
                onRefresh={onRefrescar}
                tintColor={tema.color.primario}
                colors={[tema.color.primario]}
              />
            ) : undefined
          }
        >
          {contenido}
        </ScrollView>
      ) : (
        <View style={estilos.contenido}>{contenido}</View>
      )}
    </SafeAreaView>
  );
}
