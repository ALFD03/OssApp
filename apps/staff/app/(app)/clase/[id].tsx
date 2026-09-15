import {
  DIAS_SEMANA,
  ETIQUETA_NIVEL,
  formatearFranja,
  nombreDia,
  puede,
  type ClaseConDetalle,
} from '@ossapp/core';
import {
  anadirHorario,
  eliminarHorario,
  listarAlumnosDeClase,
  obtenerClase,
  useAuth,
} from '@ossapp/data';
import {
  Boton,
  Campo,
  Cargando,
  EstadoVacio,
  Fila,
  Insignia,
  Pantalla,
  Selector,
  Separador,
  Tarjeta,
  tipografia,
  useEstilos,
  type Tema,
} from '@ossapp/ui';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

const crearEstilos = (tema: Tema) =>
  StyleSheet.create({
    error: { ...tipografia.cuerpo, color: tema.color.peligro },
    dato: { ...tipografia.cuerpo, color: tema.color.textoSecundario },
    lista: { padding: 0, overflow: 'hidden' },
  });

const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

export default function DetalleClase() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { perfil } = useAuth();
  const estilos = useEstilos(crearEstilos);
  const router = useRouter();

  const [detalleClase, setDetalleClase] = useState<ClaseConDetalle | null>(null);
  const [alumnos, setAlumnos] = useState<{ id: string; nombre: string; apellido: string }[]>([]);
  const [dia, setDia] = useState<string>('1');
  const [inicio, setInicio] = useState('17:00');
  const [fin, setFin] = useState('18:00');
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    if (!id) return;
    try {
      const [detalle, inscritos] = await Promise.all([obtenerClase(id), listarAlumnosDeClase(id)]);
      setDetalleClase(detalle);
      setAlumnos(inscritos);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar la clase.');
    } finally {
      setCargando(false);
    }
  }, [id]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  if (cargando) return <Cargando />;
  if (!detalleClase || !perfil) {
    return (
      <Pantalla>
        <EstadoVacio
          icono="alert-circle-outline"
          titulo="Clase no encontrada"
          detalle="Puede que no pertenezca a tu dojo."
        />
      </Pantalla>
    );
  }

  // Alias no nulo: conserva el estrechamiento dentro de los callbacks.
  const clase = detalleClase;
  const puedeGestionar = puede(perfil.rol, 'clases.gestionar');

  async function anadir() {
    if (!HORA.test(inicio) || !HORA.test(fin)) {
      setError('Las horas deben tener el formato HH:MM (24 horas).');
      return;
    }
    if (fin <= inicio) {
      setError('La hora de fin debe ser posterior a la de inicio.');
      return;
    }
    if (!perfil?.dojo_id) return;

    setGuardando(true);
    try {
      await anadirHorario(perfil.dojo_id, clase.id, {
        dia_semana: Number(dia),
        hora_inicio: inicio,
        hora_fin: fin,
      });
      await cargar();
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo anadir el horario.');
    } finally {
      setGuardando(false);
    }
  }

  function confirmarBorrado(horarioId: string, descripcion: string) {
    Alert.alert('Quitar horario', `Se eliminara la franja ${descripcion}.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Quitar',
        style: 'destructive',
        onPress: () => {
          void eliminarHorario(horarioId).then(cargar);
        },
      },
    ]);
  }

  return (
    <Pantalla>
      <Tarjeta titulo={clase.nombre}>
        <Text style={estilos.dato}>
          {ETIQUETA_NIVEL[clase.nivel]}
          {clase.sensei ? ` · Sensei ${clase.sensei.nombre} ${clase.sensei.apellido}` : ' · Sin sensei asignado'}
        </Text>
        <Insignia
          texto={`${clase.inscritos} inscritos${clase.capacidad ? ` de ${clase.capacidad}` : ''}`}
          tono={clase.capacidad && clase.inscritos >= clase.capacidad ? 'advertencia' : 'acento'}
        />
      </Tarjeta>

      <Tarjeta titulo="Horarios">
        {clase.horarios.length === 0 ? (
          <Text style={estilos.dato}>Sin horarios. La clase no aparecera para marcar asistencia.</Text>
        ) : (
          clase.horarios.map((horario) => (
            <Fila
              key={horario.id}
              titulo={nombreDia(horario.dia_semana)}
              detalle={formatearFranja(horario)}
              inicial={nombreDia(horario.dia_semana)}
              onPress={
                puedeGestionar
                  ? () =>
                      confirmarBorrado(
                        horario.id,
                        `${nombreDia(horario.dia_semana)} ${formatearFranja(horario)}`,
                      )
                  : undefined
              }
            />
          ))
        )}
      </Tarjeta>

      {puedeGestionar && (
        <Tarjeta titulo="Anadir horario">
          <Selector
            etiqueta="Dia"
            opciones={DIAS_SEMANA.map((etiqueta, indice) => ({
              valor: String(indice),
              etiqueta: etiqueta.slice(0, 3),
            }))}
            valor={dia}
            onCambiar={setDia}
          />
          <Campo etiqueta="Hora de inicio" value={inicio} onChangeText={setInicio} placeholder="17:00" />
          <Campo etiqueta="Hora de fin" value={fin} onChangeText={setFin} placeholder="18:00" />
          <Boton titulo="Anadir" onPress={anadir} cargando={guardando} />
        </Tarjeta>
      )}

      <Tarjeta titulo="Alumnos inscritos" style={estilos.lista}>
        {alumnos.length === 0 ? (
          <EstadoVacio
            icono="people-outline"
            titulo="Sin alumnos"
            detalle="Asigna alumnos a esta clase desde la ficha de cada alumno."
          />
        ) : (
          alumnos.map((alumno, indice) => (
            <View key={alumno.id}>
              {indice > 0 && <Separador />}
              <Fila
                titulo={`${alumno.nombre} ${alumno.apellido}`}
                onPress={() => router.push(`/alumno/${alumno.id}`)}
              />
            </View>
          ))
        )}
      </Tarjeta>

      {!!error && <Text style={estilos.error}>{error}</Text>}
      <Boton titulo="Volver" variante="texto" onPress={() => router.back()} />
    </Pantalla>
  );
}
