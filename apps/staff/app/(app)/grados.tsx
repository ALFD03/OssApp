import {
  puede,
  type AlumnoConDetalle,
  type Cinturon as TipoCinturon,
  type ExamenConDetalle,
  type RequisitoGrado,
  type ResultadoExamen,
} from '@ossapp/core';
import {
  guardarRequisito,
  listarAlumnos,
  listarCinturones,
  listarExamenes,
  listarRequisitos,
  registrarExamen,
  useAuth,
} from '@ossapp/data';
import {
  Boton,
  Campo,
  Cinturon,
  EstadoVacio,
  Fila,
  Insignia,
  Pantalla,
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
    exito: { ...tipografia.cuerpo, color: tema.color.exito },
    dato: { ...tipografia.cuerpo, color: tema.color.textoSecundario },
    lista: { padding: 0, overflow: 'hidden' },
    cintas: { flexDirection: 'row', flexWrap: 'wrap', gap: espaciado.sm },
  });

type Vista = 'examenes' | 'requisitos';

export default function Grados() {
  const { perfil } = useAuth();
  const estilos = useEstilos(crearEstilos);

  const [vista, setVista] = useState<Vista>('examenes');
  const [alumnos, setAlumnos] = useState<AlumnoConDetalle[]>([]);
  const [cinturones, setCinturones] = useState<TipoCinturon[]>([]);
  const [requisitos, setRequisitos] = useState<RequisitoGrado[]>([]);
  const [examenes, setExamenes] = useState<ExamenConDetalle[]>([]);

  const [alumnoId, setAlumnoId] = useState<string | null>(null);
  const [cinturonId, setCinturonId] = useState<string | null>(null);
  const [resultado, setResultado] = useState<ResultadoExamen>('aprobado');
  const [observaciones, setObservaciones] = useState('');

  const [editando, setEditando] = useState<string | null>(null);
  const [asistencias, setAsistencias] = useState('');
  const [meses, setMeses] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [refrescando, setRefrescando] = useState(false);

  const cargar = useCallback(async () => {
    if (!perfil) return;
    setRefrescando(true);
    try {
      const [lista, escala, reqs, historial] = await Promise.all([
        listarAlumnos({ soloActivos: true }),
        listarCinturones(),
        listarRequisitos(),
        listarExamenes(),
      ]);
      setAlumnos(lista);
      setCinturones(escala);
      setRequisitos(reqs);
      setExamenes(historial);
      setAlumnoId((actual) => actual ?? lista[0]?.id ?? null);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar los grados.');
    } finally {
      setRefrescando(false);
    }
  }, [perfil]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  if (!perfil) return null;
  const puedeDefinir = puede(perfil.rol, 'grados.requisitos.definir');

  async function guardarExamen() {
    if (!perfil?.dojo_id || !alumnoId || !cinturonId) {
      setError('Elige el alumno y el cinturon al que presenta.');
      return;
    }
    setGuardando(true);
    try {
      await registrarExamen({
        dojoId: perfil.dojo_id,
        alumnoId,
        cinturonDestinoId: cinturonId,
        resultado,
        observaciones: observaciones.trim() || null,
      });
      setObservaciones('');
      setCinturonId(null);
      setMensaje(
        resultado === 'aprobado'
          ? 'Examen registrado. El cinturon y el certificado se actualizan solos.'
          : 'Examen registrado como reprobado. El cinturon no cambia.',
      );
      setError(null);
      await cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo registrar el examen.');
      setMensaje(null);
    } finally {
      setGuardando(false);
    }
  }

  async function guardarRequisitos(cinturon: TipoCinturon) {
    if (!perfil?.dojo_id) return;
    const min = Number(asistencias);
    const mes = Number(meses);
    if (!Number.isInteger(min) || min < 0 || !Number.isInteger(mes) || mes < 0) {
      setError('Las asistencias y los meses deben ser numeros enteros no negativos.');
      return;
    }
    try {
      await guardarRequisito(perfil.dojo_id, cinturon.id, {
        asistencias_minimas: min,
        meses_minimos_en_grado_anterior: mes,
        requiere_solvencia: true,
      });
      setEditando(null);
      setError(null);
      await cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron guardar los requisitos.');
    }
  }

  const requisitoDe = new Map(requisitos.map((r) => [r.cinturon_id, r]));

  return (
    <Pantalla titulo="Grados" onRefrescar={cargar} refrescando={refrescando}>
      {!!error && <Text style={estilos.error}>{error}</Text>}
      {!!mensaje && <Text style={estilos.exito}>{mensaje}</Text>}

      <Selector
        opciones={[
          { valor: 'examenes' as const, etiqueta: 'Examenes' },
          ...(puedeDefinir ? [{ valor: 'requisitos' as const, etiqueta: 'Requisitos' }] : []),
        ]}
        valor={vista}
        onCambiar={setVista}
      />

      {vista === 'examenes' && (
        <>
          <Tarjeta titulo="Registrar examen">
            {alumnos.length === 0 || cinturones.length === 0 ? (
              <Text style={estilos.dato}>
                Hacen falta alumnos activos y una escala de cinturones para registrar examenes.
              </Text>
            ) : (
              <>
                <Selector
                  etiqueta="Alumno"
                  opciones={alumnos.map((a) => ({
                    valor: a.id,
                    etiqueta: `${a.nombre} ${a.apellido}`,
                  }))}
                  valor={alumnoId}
                  onCambiar={setAlumnoId}
                  desplazable
                />
                <Selector
                  etiqueta="Cinturon al que presenta"
                  opciones={cinturones.map((c) => ({ valor: c.id, etiqueta: c.nombre }))}
                  valor={cinturonId}
                  onCambiar={setCinturonId}
                  desplazable
                />
                <Selector
                  etiqueta="Resultado"
                  opciones={[
                    { valor: 'aprobado' as const, etiqueta: 'Aprobado' },
                    { valor: 'reprobado' as const, etiqueta: 'Reprobado' },
                  ]}
                  valor={resultado}
                  onCambiar={setResultado}
                />
                <Campo
                  etiqueta="Observaciones"
                  value={observaciones}
                  onChangeText={setObservaciones}
                  placeholder="Kata, kumite, puntos a mejorar"
                  multiline
                />
                <Boton titulo="Registrar examen" onPress={guardarExamen} cargando={guardando} />
              </>
            )}
          </Tarjeta>

          <Tarjeta titulo="Historial del dojo" style={estilos.lista}>
            {examenes.length === 0 ? (
              <EstadoVacio
                icono="ribbon-outline"
                titulo="Sin examenes registrados"
                detalle="Los examenes que registres apareceran aqui."
              />
            ) : (
              examenes.slice(0, 40).map((examen, indice) => (
                <View key={examen.id}>
                  {indice > 0 && <Separador />}
                  <Fila
                    titulo={`${examen.alumno?.nombre ?? ''} ${examen.alumno?.apellido ?? ''}`}
                    detalle={`${examen.cinturon?.nombre ?? ''} · ${examen.fecha}`}
                    derecha={
                      <Insignia
                        texto={examen.resultado === 'aprobado' ? 'Aprobado' : 'Reprobado'}
                        tono={examen.resultado === 'aprobado' ? 'exito' : 'peligro'}
                      />
                    }
                  />
                </View>
              ))
            )}
          </Tarjeta>
        </>
      )}

      {vista === 'requisitos' && puedeDefinir && (
        <>
          <Tarjeta titulo="Escala del dojo">
            <View style={estilos.cintas}>
              {cinturones.map((cinturon) => (
                <Cinturon key={cinturon.id} nombre={cinturon.nombre} color={cinturon.color} />
              ))}
            </View>
          </Tarjeta>

          <Tarjeta titulo="Requisitos por cinturon" style={estilos.lista}>
            {cinturones.length === 0 ? (
              <EstadoVacio icono="ribbon-outline" titulo="Sin cinturones definidos" />
            ) : (
              cinturones.map((cinturon, indice) => {
                const requisito = requisitoDe.get(cinturon.id);
                return (
                  <View key={cinturon.id}>
                    {indice > 0 && <Separador />}
                    <Fila
                      titulo={cinturon.nombre}
                      inicial={cinturon.nombre}
                      detalle={
                        requisito
                          ? `${requisito.asistencias_minimas} asistencias · ${requisito.meses_minimos_en_grado_anterior} meses${
                              requisito.requiere_solvencia ? ' · solvencia' : ''
                            }`
                          : 'Sin requisitos definidos'
                      }
                      onPress={() => {
                        setEditando(cinturon.id);
                        setAsistencias(String(requisito?.asistencias_minimas ?? 0));
                        setMeses(String(requisito?.meses_minimos_en_grado_anterior ?? 0));
                      }}
                    />
                    {editando === cinturon.id && (
                      <View style={{ paddingHorizontal: espaciado.lg }}>
                        <Campo
                          etiqueta="Asistencias minimas"
                          value={asistencias}
                          onChangeText={setAsistencias}
                          keyboardType="number-pad"
                        />
                        <Campo
                          etiqueta="Meses minimos en el grado anterior"
                          value={meses}
                          onChangeText={setMeses}
                          keyboardType="number-pad"
                        />
                        <Boton titulo="Guardar" onPress={() => guardarRequisitos(cinturon)} />
                        <Boton
                          titulo="Cancelar"
                          variante="texto"
                          onPress={() => setEditando(null)}
                        />
                      </View>
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
