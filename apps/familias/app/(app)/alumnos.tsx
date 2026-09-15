import { edadDe, resumirHorarios, type AlumnoConDetalle, type ClaseConDetalle } from '@ossapp/core';
import { listarAlumnos, listarClases, useAuth } from '@ossapp/data';
import {
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
import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

const crearEstilos = (tema: Tema) =>
  StyleSheet.create({
    error: { ...tipografia.cuerpo, color: tema.color.peligro },
    dato: { ...tipografia.cuerpo, color: tema.color.textoSecundario },
    lista: { padding: 0, overflow: 'hidden' },
  });

export default function MisAlumnos() {
  const { perfil } = useAuth();
  const estilos = useEstilos(crearEstilos);
  const [alumnos, setAlumnos] = useState<AlumnoConDetalle[]>([]);
  const [clases, setClases] = useState<ClaseConDetalle[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refrescando, setRefrescando] = useState(false);

  const cargar = useCallback(async () => {
    setRefrescando(true);
    try {
      // RLS acota: el representante recibe solo sus alumnos; el alumno, su ficha.
      const [mios, catalogo] = await Promise.all([listarAlumnos(), listarClases()]);
      setAlumnos(mios);
      setClases(catalogo);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar los alumnos.');
    } finally {
      setRefrescando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  if (!perfil) return null;
  const esAlumno = perfil.rol === 'alumno';

  return (
    <Pantalla
      titulo={esAlumno ? 'Mi ficha' : 'Mis alumnos'}
      onRefrescar={cargar}
      refrescando={refrescando}
    >
      {!!error && <Text style={estilos.error}>{error}</Text>}

      {alumnos.length === 0 ? (
        <EstadoVacio
          icono="people-outline"
          titulo={esAlumno ? 'Sin ficha de alumno' : 'Sin alumnos asignados'}
          detalle="Pide al maestro de tu dojo que revise tu registro."
        />
      ) : (
        alumnos.map((alumno) => {
          const edad = edadDe(alumno.fecha_nacimiento);
          return (
            <Tarjeta key={alumno.id} titulo={`${alumno.nombre} ${alumno.apellido}`}>
              <Text style={estilos.dato}>
                {[edad !== null ? `${edad} anos` : null, `Ingreso: ${alumno.fecha_ingreso}`]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
              {!alumno.activo && <Insignia texto="Inactivo" tono="advertencia" />}

              <View style={estilos.lista}>
                {alumno.clases.length === 0 ? (
                  <Text style={estilos.dato}>Sin clase asignada todavia.</Text>
                ) : (
                  alumno.clases.map((clase, indice) => {
                    const detalle = clases.find((c) => c.id === clase.id);
                    return (
                      <View key={clase.id}>
                        {indice > 0 && <Separador />}
                        <Fila
                          titulo={clase.nombre}
                          detalle={
                            detalle
                              ? `${resumirHorarios(detalle.horarios)}${
                                  detalle.sensei
                                    ? ` · Sensei ${detalle.sensei.nombre} ${detalle.sensei.apellido}`
                                    : ''
                                }`
                              : undefined
                          }
                        />
                      </View>
                    );
                  })
                )}
              </View>
            </Tarjeta>
          );
        })
      )}
    </Pantalla>
  );
}
