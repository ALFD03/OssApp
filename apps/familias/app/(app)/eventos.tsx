import {
  ETIQUETA_ESTADO_VERIFICACION,
  ETIQUETA_TIPO_EVENTO,
  esGratuito,
  eventoLleno,
  formatearMonto,
  resumenFechaEvento,
  tonoDeEstado,
  type AlumnoConDetalle,
  type Evento,
  type InscripcionConDetalle,
} from '@ossapp/core';
import {
  inscribirse,
  listarAlumnos,
  listarEventos,
  listarInscripciones,
  subirComprobante,
  useAuth,
} from '@ossapp/data';
import {
  Boton,
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
import * as ImagePicker from 'expo-image-picker';
import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

const crearEstilos = (tema: Tema) =>
  StyleSheet.create({
    error: { ...tipografia.cuerpo, color: tema.color.peligro },
    exito: { ...tipografia.cuerpo, color: tema.color.exito },
    dato: { ...tipografia.cuerpo, color: tema.color.textoSecundario },
    meta: { ...tipografia.pie, color: tema.color.textoTenue },
    lista: { padding: 0, overflow: 'hidden' },
    fila: { flexDirection: 'row', gap: espaciado.sm, flexWrap: 'wrap' },
  });

export default function Eventos() {
  const { perfil } = useAuth();
  const estilos = useEstilos(crearEstilos);

  const [eventos, setEventos] = useState<Evento[]>([]);
  const [alumnos, setAlumnos] = useState<AlumnoConDetalle[]>([]);
  const [inscripciones, setInscripciones] = useState<InscripcionConDetalle[]>([]);
  const [alumnoId, setAlumnoId] = useState<string | null>(null);
  const [inscribiendo, setInscribiendo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [refrescando, setRefrescando] = useState(false);

  const puedeInscribir = perfil?.rol === 'representante' || perfil?.rol === 'alumno';

  const cargar = useCallback(async () => {
    setRefrescando(true);
    try {
      const [cartelera, mios, propias] = await Promise.all([
        listarEventos(true),
        listarAlumnos({ soloActivos: true }),
        listarInscripciones(),
      ]);
      setEventos(cartelera);
      setAlumnos(mios);
      setInscripciones(propias);
      setAlumnoId((actual) => actual ?? mios[0]?.id ?? null);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar los eventos.');
    } finally {
      setRefrescando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  async function apuntar(evento: Evento) {
    if (!perfil?.dojo_id || !alumnoId) return;
    setInscribiendo(evento.id);
    setError(null);

    try {
      let comprobante: string | null = null;

      // Si el evento cuesta, el comprobante es obligatorio: sin el, el maestro
      // no tiene nada que verificar.
      if (!esGratuito(evento)) {
        const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permiso.granted) {
          setError('Necesitamos acceso a tus fotos para adjuntar el comprobante.');
          return;
        }
        const elegida = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          quality: 0.7,
        });
        if (elegida.canceled) return;

        const archivo = elegida.assets[0];
        comprobante = await subirComprobante(perfil.dojo_id, alumnoId, {
          uri: archivo.uri,
          nombre: archivo.fileName ?? 'comprobante.jpg',
          tipo: archivo.mimeType ?? 'image/jpeg',
        });
      }

      await inscribirse({
        dojoId: perfil.dojo_id,
        eventoId: evento.id,
        alumnoId,
        comprobanteUrl: comprobante,
      });

      setMensaje(
        esGratuito(evento)
          ? 'Inscripcion enviada. El dojo confirmara tu plaza.'
          : 'Inscripcion y comprobante enviados. El maestro los revisara.',
      );
      await cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo completar la inscripcion.');
      setMensaje(null);
    } finally {
      setInscribiendo(null);
    }
  }

  if (!perfil) return null;

  const inscritoEn = new Map(
    inscripciones
      .filter((i) => i.alumno_id === alumnoId)
      .map((i) => [i.evento_id, i] as const),
  );

  return (
    <Pantalla titulo="Eventos" onRefrescar={cargar} refrescando={refrescando}>
      {!!error && <Text style={estilos.error}>{error}</Text>}
      {!!mensaje && <Text style={estilos.exito}>{mensaje}</Text>}

      {puedeInscribir && alumnos.length > 1 && (
        <Selector
          etiqueta="Inscribir a"
          opciones={alumnos.map((a) => ({ valor: a.id, etiqueta: `${a.nombre} ${a.apellido}` }))}
          valor={alumnoId}
          onCambiar={setAlumnoId}
          desplazable
        />
      )}

      {eventos.length === 0 ? (
        <EstadoVacio
          icono="calendar-outline"
          titulo="Sin eventos proximos"
          detalle="Cuando el dojo programe un torneo o seminario aparecera aqui."
        />
      ) : (
        eventos.map((evento) => {
          const inscripcion = inscritoEn.get(evento.id);
          const lleno = eventoLleno(evento);

          return (
            <Tarjeta key={evento.id} titulo={evento.nombre}>
              <View style={estilos.fila}>
                <Insignia texto={ETIQUETA_TIPO_EVENTO[evento.tipo]} tono="acento" />
                {esGratuito(evento) ? (
                  <Insignia texto="Gratuito" tono="exito" />
                ) : (
                  <Insignia texto={formatearMonto(Number(evento.costo), evento.moneda)} tono="info" />
                )}
                {lleno && <Insignia texto="Sin cupo" tono="peligro" />}
              </View>

              <Text style={estilos.dato}>{resumenFechaEvento(evento)}</Text>
              {!!evento.lugar && <Text style={estilos.dato}>{evento.lugar}</Text>}
              {!!evento.descripcion && <Text style={estilos.dato}>{evento.descripcion}</Text>}

              <Text style={estilos.meta}>
                {evento.cupo === null
                  ? `${evento.inscritos} inscritos · sin limite de plazas`
                  : `${evento.inscritos} de ${evento.cupo} plazas ocupadas`}
              </Text>

              {inscripcion ? (
                <Insignia
                  texto={`Inscripcion ${ETIQUETA_ESTADO_VERIFICACION[inscripcion.estado].toLowerCase()}`}
                  tono={tonoDeEstado(inscripcion.estado)}
                />
              ) : (
                puedeInscribir &&
                !lleno && (
                  <Boton
                    titulo={esGratuito(evento) ? 'Inscribirme' : 'Inscribirme y subir comprobante'}
                    onPress={() => apuntar(evento)}
                    cargando={inscribiendo === evento.id}
                  />
                )
              )}

              {inscripcion?.estado === 'rechazado' && !!inscripcion.motivo_rechazo && (
                <Text style={estilos.error}>Motivo: {inscripcion.motivo_rechazo}</Text>
              )}
            </Tarjeta>
          );
        })
      )}

      {inscripciones.length > 0 && (
        <Tarjeta titulo="Mis inscripciones" style={estilos.lista}>
          {inscripciones.map((inscripcion, indice) => (
            <View key={inscripcion.id}>
              {indice > 0 && <Separador />}
              <Fila
                titulo={inscripcion.evento?.nombre ?? 'Evento'}
                inicial={inscripcion.alumno?.nombre ?? '?'}
                detalle={`${inscripcion.alumno?.nombre ?? ''} · ${inscripcion.evento?.fecha ?? ''}`}
                derecha={
                  <Insignia
                    texto={ETIQUETA_ESTADO_VERIFICACION[inscripcion.estado]}
                    tono={tonoDeEstado(inscripcion.estado)}
                  />
                }
              />
            </View>
          ))}
        </Tarjeta>
      )}
    </Pantalla>
  );
}
