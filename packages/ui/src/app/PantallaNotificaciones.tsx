import { ICONO_NOTIFICACION, haceCuanto, type Notificacion } from '@ossapp/core';
import { listarNotificaciones, marcarLeida, marcarTodasLeidas } from '@ossapp/data';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Boton } from '../Boton';
import { EstadoVacio, Separador } from '../Lista';
import { Pantalla } from '../Pantalla';
import { Tarjeta } from '../Tarjeta';
import { useEstilos, useTema } from '../TemaProvider';
import { espaciado, radios, type Tema } from '../temas';
import { tipografia } from '../tipografia';

const crearEstilos = (tema: Tema) =>
  StyleSheet.create({
    lista: { padding: 0, overflow: 'hidden' },
    error: { ...tipografia.cuerpo, color: tema.color.peligro },
    fila: { flexDirection: 'row', gap: espaciado.md, padding: espaciado.lg },
    presionada: { backgroundColor: tema.color.superficieAlterna },
    // Las no leidas llevan un fondo tenue: sin eso, la lista es indistinguible.
    noLeida: { backgroundColor: tema.color.primarioSuave },
    icono: {
      width: 36,
      height: 36,
      borderRadius: radios.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: tema.color.superficieAlterna,
    },
    centro: { flex: 1, gap: 2 },
    titulo: { ...tipografia.cuerpo, color: tema.color.texto, fontWeight: '600' },
    cuerpo: { ...tipografia.pie, color: tema.color.textoSecundario },
    cuando: { ...tipografia.etiqueta, color: tema.color.textoTenue },
  });

/** Bandeja de avisos. Identica en Staff y Familias. */
export function PantallaNotificaciones() {
  const tema = useTema();
  const estilos = useEstilos(crearEstilos);
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refrescando, setRefrescando] = useState(false);

  const cargar = useCallback(async () => {
    setRefrescando(true);
    try {
      setNotificaciones(await listarNotificaciones());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar las notificaciones.');
    } finally {
      setRefrescando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const sinLeer = notificaciones.filter((n) => !n.leida).length;

  return (
    <Pantalla titulo="Notificaciones" onRefrescar={cargar} refrescando={refrescando}>
      {!!error && <Text style={estilos.error}>{error}</Text>}

      {sinLeer > 0 && (
        <Boton
          titulo={`Marcar ${sinLeer} como leidas`}
          variante="secundario"
          onPress={() => void marcarTodasLeidas().then(cargar)}
        />
      )}

      <Tarjeta style={estilos.lista}>
        {notificaciones.length === 0 ? (
          <EstadoVacio
            icono="notifications-off-outline"
            titulo="Sin notificaciones"
            detalle="Aqui llegaran los avisos de pagos, examenes y eventos."
          />
        ) : (
          notificaciones.map((notificacion, indice) => (
            <View key={notificacion.id}>
              {indice > 0 && <Separador />}
              <Pressable
                accessibilityRole="button"
                onPress={() => void marcarLeida(notificacion.id).then(cargar)}
                style={({ pressed }) => [
                  estilos.fila,
                  !notificacion.leida && estilos.noLeida,
                  pressed && estilos.presionada,
                ]}
              >
                <View style={estilos.icono}>
                  <Ionicons
                    name={ICONO_NOTIFICACION[notificacion.tipo] as never}
                    size={18}
                    color={notificacion.leida ? tema.color.textoTenue : tema.color.primario}
                  />
                </View>
                <View style={estilos.centro}>
                  <Text style={estilos.titulo}>{notificacion.titulo}</Text>
                  <Text style={estilos.cuerpo}>{notificacion.cuerpo}</Text>
                  <Text style={estilos.cuando}>{haceCuanto(notificacion.creado_el)}</Text>
                </View>
              </Pressable>
            </View>
          ))
        )}
      </Tarjeta>
    </Pantalla>
  );
}
