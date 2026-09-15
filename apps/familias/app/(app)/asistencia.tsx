import {
  hoyISO,
  mensajeDeErrorAsistencia,
  nombreDia,
  type AlumnoConDetalle,
  type AsistenciaConDetalle,
} from '@ossapp/core';
import { listarAlumnos, listarAsistencias, registrarAsistenciaQr, useAuth } from '@ossapp/data';
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
import { CameraView, useCameraPermissions } from 'expo-camera';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

const crearEstilos = (tema: Tema) =>
  StyleSheet.create({
    error: { ...tipografia.cuerpo, color: tema.color.peligro },
    exito: { ...tipografia.cuerpo, color: tema.color.exito },
    dato: { ...tipografia.cuerpo, color: tema.color.textoSecundario },
    camara: {
      height: 300,
      borderRadius: 16,
      overflow: 'hidden',
      backgroundColor: tema.color.superficieAlterna,
    },
    marco: {
      ...StyleSheet.absoluteFill,
      alignItems: 'center',
      justifyContent: 'center',
    },
    mira: {
      width: 190,
      height: 190,
      borderWidth: 3,
      borderColor: tema.color.acento,
      borderRadius: 16,
    },
    pie: { ...tipografia.pie, color: tema.color.textoTenue, marginTop: espaciado.xs },
    lista: { padding: 0, overflow: 'hidden' },
  });

export default function Asistencia() {
  const { perfil } = useAuth();
  const estilos = useEstilos(crearEstilos);
  const [permiso, pedirPermiso] = useCameraPermissions();

  const [alumnos, setAlumnos] = useState<AlumnoConDetalle[]>([]);
  const [alumnoId, setAlumnoId] = useState<string | null>(null);
  const [historial, setHistorial] = useState<AsistenciaConDetalle[]>([]);
  const [escaneando, setEscaneando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refrescando, setRefrescando] = useState(false);

  // Evita que la camara dispare la misma lectura varias veces por segundo.
  const procesando = useRef(false);

  const cargar = useCallback(async () => {
    setRefrescando(true);
    try {
      const [mios, registros] = await Promise.all([listarAlumnos({ soloActivos: true }), listarAsistencias()]);
      setAlumnos(mios);
      setAlumnoId((actual) => actual ?? mios[0]?.id ?? null);
      setHistorial(registros);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar la asistencia.');
    } finally {
      setRefrescando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const alEscanear = useCallback(
    async ({ data }: { data: string }) => {
      if (procesando.current || !alumnoId) return;
      procesando.current = true;
      setEscaneando(false);

      try {
        // El client_id se genera aqui, antes de enviar: si la peticion se
        // reintenta, el servidor deduplica en vez de crear una segunda marca.
        const clientId = globalThis.crypto?.randomUUID?.();
        await registrarAsistenciaQr(data.trim(), alumnoId, clientId);
        const alumno = alumnos.find((a) => a.id === alumnoId);
        setMensaje(`Asistencia registrada para ${alumno?.nombre ?? 'el alumno'}.`);
        setError(null);
        await cargar();
      } catch (e) {
        setError(mensajeDeErrorAsistencia(e));
        setMensaje(null);
      } finally {
        // Margen para que no se relance con el mismo codigo aun en pantalla.
        setTimeout(() => {
          procesando.current = false;
        }, 1500);
      }
    },
    [alumnoId, alumnos, cargar],
  );

  if (!perfil) return null;

  const hoy = hoyISO();
  const yaMarcoHoy = historial.some((a) => a.fecha === hoy && a.alumno_id === alumnoId);

  return (
    <Pantalla titulo="Asistencia" onRefrescar={cargar} refrescando={refrescando}>
      {!!error && <Text style={estilos.error}>{error}</Text>}
      {!!mensaje && <Text style={estilos.exito}>{mensaje}</Text>}

      {alumnos.length === 0 ? (
        <EstadoVacio
          icono="people-outline"
          titulo="Sin alumnos"
          detalle="Pide al maestro de tu dojo que revise tu registro."
        />
      ) : (
        <Tarjeta titulo="Marcar asistencia">
          {alumnos.length > 1 && (
            <Selector
              etiqueta="Alumno"
              opciones={alumnos.map((a) => ({ valor: a.id, etiqueta: `${a.nombre} ${a.apellido}` }))}
              valor={alumnoId}
              onCambiar={setAlumnoId}
              desplazable
            />
          )}

          {yaMarcoHoy && <Insignia texto="Ya marcada hoy" tono="exito" />}

          {escaneando ? (
            <>
              <View style={estilos.camara}>
                <CameraView
                  style={StyleSheet.absoluteFill}
                  facing="back"
                  barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                  onBarcodeScanned={alEscanear}
                />
                <View style={estilos.marco} pointerEvents="none">
                  <View style={estilos.mira} />
                </View>
              </View>
              <Text style={estilos.pie}>Apunta al QR pegado en la entrada del dojo.</Text>
              <Boton titulo="Cancelar" variante="texto" onPress={() => setEscaneando(false)} />
            </>
          ) : (
            <>
              <Text style={estilos.dato}>
                Escanea el codigo impreso en el dojo al llegar a clase. El sistema comprueba que
                haya una clase activa en ese horario.
              </Text>
              <Boton
                titulo="Escanear QR"
                onPress={async () => {
                  if (!permiso?.granted) {
                    const resultado = await pedirPermiso();
                    if (!resultado.granted) {
                      setError('Necesitamos permiso de camara para escanear el codigo.');
                      return;
                    }
                  }
                  setMensaje(null);
                  setError(null);
                  setEscaneando(true);
                }}
              />
            </>
          )}
        </Tarjeta>
      )}

      <Tarjeta titulo="Historial" style={estilos.lista}>
        {historial.length === 0 ? (
          <EstadoVacio
            icono="checkmark-done-outline"
            titulo="Sin asistencias todavia"
            detalle="Las marcas apareceran aqui en cuanto escanees el QR."
          />
        ) : (
          historial.slice(0, 30).map((registro, indice) => (
            <View key={registro.id}>
              {indice > 0 && <Separador />}
              <Fila
                titulo={registro.clase?.nombre ?? 'Clase'}
                inicial={registro.alumno?.nombre ?? '?'}
                detalle={`${registro.alumno?.nombre ?? ''} · ${nombreDia(
                  new Date(`${registro.fecha}T12:00:00`).getDay(),
                )} ${registro.fecha}`}
                derecha={
                  <Insignia
                    texto={registro.origen === 'qr' ? 'QR' : 'Manual'}
                    tono={registro.origen === 'qr' ? 'exito' : 'info'}
                  />
                }
              />
            </View>
          ))
        )}
      </Tarjeta>
    </Pantalla>
  );
}
