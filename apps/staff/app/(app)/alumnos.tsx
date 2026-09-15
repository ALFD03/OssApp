import { edadDe, puede, type AlumnoConDetalle } from '@ossapp/core';
import { listarAlumnos, useAuth } from '@ossapp/data';
import {
  BotonFlotante,
  Campo,
  EstadoVacio,
  Fila,
  Insignia,
  Pantalla,
  Separador,
  Tarjeta,
  tipografia,
  useEstilos,
  type Tema,
} from '@ossapp/ui';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

const crearEstilos = (tema: Tema) =>
  StyleSheet.create({
    lista: { padding: 0, overflow: 'hidden' },
    error: { ...tipografia.cuerpo, color: tema.color.peligro },
    resumen: { ...tipografia.pie, color: tema.color.textoSecundario },
  });

export default function Alumnos() {
  const { perfil } = useAuth();
  const estilos = useEstilos(crearEstilos);
  const router = useRouter();
  const [alumnos, setAlumnos] = useState<AlumnoConDetalle[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [refrescando, setRefrescando] = useState(false);

  const cargar = useCallback(async () => {
    setRefrescando(true);
    try {
      setAlumnos(await listarAlumnos());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar los alumnos.');
    } finally {
      setRefrescando(false);
    }
  }, []);

  // Al volver del detalle o del alta, la lista debe reflejar el cambio.
  useFocusEffect(
    useCallback(() => {
      void cargar();
    }, [cargar]),
  );

  const filtrados = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();
    if (!termino) return alumnos;
    return alumnos.filter((alumno) =>
      `${alumno.nombre} ${alumno.apellido}`.toLowerCase().includes(termino),
    );
  }, [alumnos, busqueda]);

  if (!perfil) return null;
  const puedeGestionar = puede(perfil.rol, 'alumnos.gestionar');

  return (
    <>
      <Pantalla titulo="Alumnos" onRefrescar={cargar} refrescando={refrescando}>
        {!!error && <Text style={estilos.error}>{error}</Text>}

        <Campo
          etiqueta="Buscar"
          value={busqueda}
          onChangeText={setBusqueda}
          placeholder="Nombre o apellido"
          autoCapitalize="none"
          autoCorrect={false}
        />

        {filtrados.length === 0 ? (
          <EstadoVacio
            icono="people-outline"
            titulo={busqueda ? 'Sin coincidencias' : 'Todavia no hay alumnos'}
            detalle={
              busqueda
                ? 'Prueba con otro nombre.'
                : puedeGestionar
                  ? 'Usa el boton "Nuevo alumno" para registrar al primero.'
                  : 'El maestro del dojo aun no ha registrado alumnos.'
            }
          />
        ) : (
          <>
            <Text style={estilos.resumen}>
              {filtrados.length} {filtrados.length === 1 ? 'alumno' : 'alumnos'}
              {busqueda ? ` de ${alumnos.length}` : ''}
            </Text>
            <Tarjeta style={estilos.lista}>
              {filtrados.map((alumno, indice) => {
                const edad = edadDe(alumno.fecha_nacimiento);
                const clases = alumno.clases.map((c) => c.nombre).join(', ');
                return (
                  <View key={alumno.id}>
                    {indice > 0 && <Separador />}
                    <Fila
                      titulo={`${alumno.nombre} ${alumno.apellido}`}
                      detalle={
                        [edad !== null ? `${edad} anos` : null, clases || 'Sin clase asignada']
                          .filter(Boolean)
                          .join(' · ')
                      }
                      derecha={
                        alumno.activo ? undefined : <Insignia texto="Inactivo" tono="neutro" />
                      }
                      onPress={() => router.push(`/alumno/${alumno.id}`)}
                    />
                  </View>
                );
              })}
            </Tarjeta>
          </>
        )}
      </Pantalla>

      {puedeGestionar && (
        <BotonFlotante titulo="Nuevo alumno" onPress={() => router.push('/alumno/nuevo')} />
      )}
    </>
  );
}
