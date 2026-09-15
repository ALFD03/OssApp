import { ETIQUETA_ESTADO_LICENCIA, ETIQUETA_ROL, nombreCompleto } from '@ossapp/core';
import { useAuth } from '@ossapp/data';
import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Boton } from '../Boton';
import { Pantalla } from '../Pantalla';
import { Tarjeta } from '../Tarjeta';
import { useContextoTema, useEstilos, useTema } from '../TemaProvider';
import { espaciado, radios, type Tema } from '../temas';
import { tipografia } from '../tipografia';
import type { PreferenciaTema } from '../TemaProvider';

const OPCIONES: { valor: PreferenciaTema; etiqueta: string }[] = [
  { valor: 'sistema', etiqueta: 'Sistema' },
  { valor: 'claro', etiqueta: 'Claro' },
  { valor: 'oscuro', etiqueta: 'Oscuro' },
];

const crearEstilos = (tema: Tema) =>
  StyleSheet.create({
    fila: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: espaciado.xs,
      gap: espaciado.lg,
    },
    etiqueta: { ...tipografia.cuerpo, color: tema.color.textoSecundario },
    valor: { ...tipografia.cuerpo, color: tema.color.texto, flexShrink: 1, textAlign: 'right' },
    selector: {
      flexDirection: 'row',
      backgroundColor: tema.color.superficieAlterna,
      borderRadius: radios.md,
      padding: espaciado.xs,
      gap: espaciado.xs,
    },
    opcion: {
      flex: 1,
      paddingVertical: espaciado.sm,
      borderRadius: radios.sm,
      alignItems: 'center',
    },
    opcionActiva: { backgroundColor: tema.color.primario },
    opcionTexto: { ...tipografia.etiqueta, color: tema.color.textoSecundario },
    opcionTextoActivo: { color: tema.color.textoSobreMarca },
    version: { ...tipografia.pie, color: tema.color.textoTenue, textAlign: 'center' },
  });

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  const estilos = useEstilos(crearEstilos);
  return (
    <View style={estilos.fila}>
      <Text style={estilos.etiqueta}>{etiqueta}</Text>
      <Text style={estilos.valor}>{valor}</Text>
    </View>
  );
}

function SelectorTema() {
  const estilos = useEstilos(crearEstilos);
  const { preferencia, cambiarPreferencia } = useContextoTema();

  return (
    <View style={estilos.selector} accessibilityRole="radiogroup">
      {OPCIONES.map(({ valor, etiqueta }) => {
        const activa = preferencia === valor;
        return (
          <Pressable
            key={valor}
            accessibilityRole="radio"
            accessibilityState={{ selected: activa }}
            onPress={() => cambiarPreferencia(valor)}
            style={[estilos.opcion, activa && estilos.opcionActiva]}
          >
            <Text style={[estilos.opcionTexto, activa && estilos.opcionTextoActivo]}>
              {etiqueta}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Perfil del usuario autenticado. Identica en ambas apps. */
export function PantallaPerfil() {
  const { perfil, salir } = useAuth();
  const tema = useTema();
  const estilos = useEstilos(crearEstilos);
  const [saliendo, setSaliendo] = useState(false);

  if (!perfil) return null;

  function confirmarSalida() {
    Alert.alert('Cerrar sesion', 'Tendras que volver a escribir tu correo y contrasena.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Cerrar sesion',
        style: 'destructive',
        onPress: () => {
          setSaliendo(true);
          void salir().finally(() => setSaliendo(false));
        },
      },
    ]);
  }

  return (
    <Pantalla titulo="Mi perfil">
      <Tarjeta>
        <Dato etiqueta="Nombre" valor={nombreCompleto(perfil)} />
        <Dato etiqueta="Correo" valor={perfil.email} />
        <Dato etiqueta="Rol" valor={ETIQUETA_ROL[perfil.rol]} />
        <Dato etiqueta="Telefono" valor={perfil.telefono ?? 'Sin registrar'} />
      </Tarjeta>

      {perfil.dojo && (
        <Tarjeta titulo="Dojo">
          <Dato etiqueta="Nombre" valor={perfil.dojo.nombre} />
          <Dato etiqueta="Licencia" valor={ETIQUETA_ESTADO_LICENCIA[perfil.dojo.estado_licencia]} />
        </Tarjeta>
      )}

      <Tarjeta titulo="Apariencia">
        <SelectorTema />
      </Tarjeta>

      <Boton
        titulo="Cerrar sesion"
        variante="secundario"
        color={tema.color.peligro}
        cargando={saliendo}
        onPress={confirmarSalida}
      />

      <Text style={estilos.version}>OssApp v0.1.0</Text>
    </Pantalla>
  );
}
