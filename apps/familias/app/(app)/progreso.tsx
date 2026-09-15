import {
  avanceRequisito,
  faltantesParaGrado,
  type AlumnoConDetalle,
  type Certificado,
  type ExamenConDetalle,
  type ProgresoGrado,
} from '@ossapp/core';
import {
  listarAlumnos,
  listarCertificados,
  listarExamenes,
  obtenerProgreso,
  useAuth,
} from '@ossapp/data';
import {
  Cinturon,
  EstadoVacio,
  Fila,
  Insignia,
  Pantalla,
  Progreso,
  Selector,
  Separador,
  Tarjeta,
  espaciado,
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
    barras: { gap: espaciado.md, marginTop: espaciado.sm },
    falta: { ...tipografia.cuerpo, color: tema.color.advertencia },
    listo: { ...tipografia.cuerpo, color: tema.color.exito },
    codigo: { ...tipografia.pie, color: tema.color.acento },
    lista: { padding: 0, overflow: 'hidden' },
  });

export default function ProgresoPantalla() {
  const { perfil } = useAuth();
  const estilos = useEstilos(crearEstilos);

  const [alumnos, setAlumnos] = useState<AlumnoConDetalle[]>([]);
  const [alumnoId, setAlumnoId] = useState<string | null>(null);
  const [progreso, setProgreso] = useState<ProgresoGrado | null>(null);
  const [examenes, setExamenes] = useState<ExamenConDetalle[]>([]);
  const [certificados, setCertificados] = useState<Certificado[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refrescando, setRefrescando] = useState(false);

  const cargarAlumnos = useCallback(async () => {
    try {
      const mios = await listarAlumnos({ soloActivos: true });
      setAlumnos(mios);
      setAlumnoId((actual) => actual ?? mios[0]?.id ?? null);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar el progreso.');
    }
  }, []);

  const cargarProgreso = useCallback(async () => {
    if (!alumnoId) return;
    setRefrescando(true);
    try {
      const [datos, historial, diplomas] = await Promise.all([
        obtenerProgreso(alumnoId),
        listarExamenes(alumnoId),
        listarCertificados(alumnoId),
      ]);
      setProgreso(datos);
      setExamenes(historial);
      setCertificados(diplomas);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar el progreso.');
    } finally {
      setRefrescando(false);
    }
  }, [alumnoId]);

  useEffect(() => {
    void cargarAlumnos();
  }, [cargarAlumnos]);

  useEffect(() => {
    void cargarProgreso();
  }, [cargarProgreso]);

  if (!perfil) return null;

  const faltan = progreso ? faltantesParaGrado(progreso) : [];
  const certificadoDe = new Map(certificados.map((c) => [c.examen_id, c]));

  return (
    <Pantalla titulo="Progreso" onRefrescar={cargarProgreso} refrescando={refrescando}>
      {!!error && <Text style={estilos.error}>{error}</Text>}

      {alumnos.length === 0 ? (
        <EstadoVacio
          icono="ribbon-outline"
          titulo="Sin alumnos"
          detalle="Pide al maestro de tu dojo que revise tu registro."
        />
      ) : (
        <>
          {alumnos.length > 1 && (
            <Selector
              etiqueta="Alumno"
              opciones={alumnos.map((a) => ({ valor: a.id, etiqueta: `${a.nombre} ${a.apellido}` }))}
              valor={alumnoId}
              onCambiar={setAlumnoId}
              desplazable
            />
          )}

          {progreso && (
            <Tarjeta titulo="Grado actual">
              <Cinturon
                nombre={progreso.cinturon_actual}
                color={
                  examenes.find((e) => e.cinturon?.nombre === progreso.cinturon_actual)?.cinturon
                    ?.color ?? '#F7F4F1'
                }
              />
              <Text style={estilos.dato}>
                {progreso.meses_en_grado} {progreso.meses_en_grado === 1 ? 'mes' : 'meses'} en este
                grado · {progreso.asistencias} asistencias
              </Text>
            </Tarjeta>
          )}

          {progreso?.siguiente_cinturon ? (
            <Tarjeta titulo={`Hacia ${progreso.siguiente_cinturon}`}>
              <View style={estilos.barras}>
                <Progreso
                  etiqueta="Asistencias"
                  avance={avanceRequisito(progreso.asistencias, progreso.asistencias_minimas)}
                  detalle={`${progreso.asistencias} de ${progreso.asistencias_minimas}`}
                />
                <Progreso
                  etiqueta="Tiempo en el grado"
                  avance={avanceRequisito(progreso.meses_en_grado, progreso.meses_minimos)}
                  detalle={`${progreso.meses_en_grado} de ${progreso.meses_minimos} meses`}
                />
                {progreso.requiere_solvencia && (
                  <Progreso
                    etiqueta="Pagos al dia"
                    avance={progreso.solvente ? 1 : 0}
                    detalle={progreso.solvente ? 'Solvente' : 'Pendiente'}
                  />
                )}
              </View>

              {progreso.elegible ? (
                <Text style={estilos.listo}>
                  Cumple los requisitos. El maestro decide cuando convocar el examen.
                </Text>
              ) : (
                <Text style={estilos.falta}>Falta: {faltan.join(', ')}.</Text>
              )}
            </Tarjeta>
          ) : (
            progreso && (
              <Tarjeta titulo="Grado maximo">
                <Text style={estilos.dato}>
                  No hay un grado superior definido en la escala de tu dojo.
                </Text>
              </Tarjeta>
            )
          )}

          <Tarjeta titulo="Historial de examenes" style={estilos.lista}>
            {examenes.length === 0 ? (
              <EstadoVacio
                icono="ribbon-outline"
                titulo="Sin examenes todavia"
                detalle="Apareceran aqui en cuanto presentes el primero."
              />
            ) : (
              examenes.map((examen, indice) => {
                const certificado = certificadoDe.get(examen.id);
                return (
                  <View key={examen.id}>
                    {indice > 0 && <Separador />}
                    <Fila
                      titulo={examen.cinturon?.nombre ?? 'Examen'}
                      inicial={examen.cinturon?.nombre ?? '?'}
                      detalle={
                        examen.observaciones
                          ? `${examen.fecha} · ${examen.observaciones}`
                          : examen.fecha
                      }
                      derecha={
                        <Insignia
                          texto={examen.resultado === 'aprobado' ? 'Aprobado' : 'Reprobado'}
                          tono={examen.resultado === 'aprobado' ? 'exito' : 'peligro'}
                        />
                      }
                    />
                    {!!certificado && (
                      <Text style={[estilos.codigo, { paddingHorizontal: espaciado.lg }]}>
                        Certificado {certificado.codigo}
                      </Text>
                    )}
                  </View>
                );
              })
            )}
          </Tarjeta>
        </>
      )}
    </Pantalla>
  );
}
