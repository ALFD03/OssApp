import {
  hoyISO,
  puede,
  resumirHorarios,
  type AsistenciaConDetalle,
  type ClaseConDetalle,
  type CodigoQr,
} from '@ossapp/core';
import {
  contarPendientes,
  encolarAsistencia,
  listarAlumnosDeClase,
  listarAsistencias,
  listarClases,
  listarCodigosQr,
  marcarAsistenciaManual,
  quitarAsistencia,
  sincronizarAsistencias,
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
  radios,
  tipografia,
  useEstilos,
  useTema,
  type Tema,
} from '@ossapp/ui';
import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

const crearEstilos = (tema: Tema) =>
  StyleSheet.create({
    error: { ...tipografia.cuerpo, color: tema.color.peligro },
    aviso: { ...tipografia.cuerpo, color: tema.color.advertencia },
    dato: { ...tipografia.cuerpo, color: tema.color.textoSecundario },
    lista: { padding: 0, overflow: 'hidden' },
    qr: {
      alignSelf: 'center',
      padding: espaciado.lg,
      // El QR necesita fondo blanco solido para que la camara lo lea, tambien
      // en tema oscuro.
      backgroundColor: '#FFFFFF',
      borderRadius: radios.md,
    },
    marcado: {
      width: 30,
      height: 30,
      borderRadius: radios.pill,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
    },
    marcadoTexto: { ...tipografia.etiqueta },
  });

export default function Asistencia() {
  const { perfil } = useAuth();
  const estilos = useEstilos(crearEstilos);
  const tema = useTema();

  const [clases, setClases] = useState<ClaseConDetalle[]>([]);
  const [codigos, setCodigos] = useState<CodigoQr[]>([]);
  const [claseId, setClaseId] = useState<string | null>(null);
  const [alumnos, setAlumnos] = useState<{ id: string; nombre: string; apellido: string }[]>([]);
  const [asistencias, setAsistencias] = useState<AsistenciaConDetalle[]>([]);
  const [verQr, setVerQr] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [pendientes, setPendientes] = useState(0);
  const [refrescando, setRefrescando] = useState(false);

  const hoy = hoyISO();
  const soloPropias = perfil?.rol === 'sensei';

  const cargar = useCallback(async () => {
    if (!perfil) return;
    setRefrescando(true);
    try {
      const [catalogo, qrs] = await Promise.all([
        listarClases(soloPropias ? { senseiId: perfil.id, soloActivas: true } : { soloActivas: true }),
        puede(perfil.rol, 'asistencia.qr.generar') ? listarCodigosQr() : Promise.resolve([]),
      ]);
      setClases(catalogo);
      setCodigos(qrs);
      setClaseId((actual) => actual ?? catalogo[0]?.id ?? null);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar las clases.');
    } finally {
      setRefrescando(false);
    }
  }, [perfil, soloPropias]);

  const cargarClase = useCallback(async () => {
    if (!claseId) return;
    try {
      const [inscritos, registros] = await Promise.all([
        listarAlumnosDeClase(claseId),
        listarAsistencias({ claseId, desde: hoy, hasta: hoy }),
      ]);
      setAlumnos(inscritos);
      setAsistencias(registros);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar el pase de lista.');
    }
  }, [claseId, hoy]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  useEffect(() => {
    void cargarClase();
  }, [cargarClase]);

  // Al abrir la pantalla se intenta vaciar lo que quedo pendiente de la ultima
  // sesion sin conexion.
  useEffect(() => {
    void (async () => {
      const resultado = await sincronizarAsistencias();
      setPendientes(resultado.pendientes);
      if (resultado.enviadas > 0) {
        setAviso(`${resultado.enviadas} asistencias pendientes se sincronizaron.`);
        void cargarClase();
      }
    })();
  }, [cargarClase]);

  if (!perfil) return null;

  const marcadosHoy = new Map(asistencias.map((a) => [a.alumno_id, a]));
  const clase = clases.find((c) => c.id === claseId);

  async function alternar(alumnoId: string) {
    if (!perfil?.dojo_id || !claseId) return;
    const existente = marcadosHoy.get(alumnoId);

    try {
      if (existente) await quitarAsistencia(existente.id);
      else await marcarAsistenciaManual(perfil.dojo_id, claseId, alumnoId, hoy);
      await cargarClase();
      setError(null);
    } catch (e) {
      // Dojos con conexion inestable: la marca no se pierde, se encola y se
      // reenvia. El client_id hace que reenviarla sea idempotente.
      if (!existente) {
        await encolarAsistencia({
          client_id: globalThis.crypto?.randomUUID?.() ?? `${alumnoId}-${hoy}`,
          dojo_id: perfil.dojo_id,
          clase_id: claseId,
          alumno_id: alumnoId,
          fecha: hoy,
        });
        setPendientes(await contarPendientes());
        setAviso('Sin conexion: la asistencia quedo guardada y se enviara al reconectar.');
        setError(null);
        return;
      }
      setError(e instanceof Error ? e.message : 'No se pudo cambiar la asistencia.');
    }
  }

  async function sincronizar() {
    const resultado = await sincronizarAsistencias();
    setPendientes(resultado.pendientes);
    setAviso(
      resultado.enviadas > 0
        ? `${resultado.enviadas} asistencias sincronizadas.`
        : 'No se pudo sincronizar todavia. Revisa la conexion.',
    );
    await cargarClase();
  }

  return (
    <Pantalla titulo="Asistencia" onRefrescar={cargar} refrescando={refrescando}>
      {!!error && <Text style={estilos.error}>{error}</Text>}
      {!!aviso && <Text style={estilos.aviso}>{aviso}</Text>}

      {pendientes > 0 && (
        <Tarjeta titulo="Pendiente de sincronizar">
          <Text style={estilos.dato}>
            {pendientes} {pendientes === 1 ? 'asistencia marcada' : 'asistencias marcadas'} sin
            conexion. Se enviaran solas al recuperar la red.
          </Text>
          <Boton titulo="Sincronizar ahora" variante="secundario" onPress={sincronizar} />
        </Tarjeta>
      )}

      {puede(perfil.rol, 'asistencia.qr.generar') && codigos.length > 0 && (
        <Tarjeta titulo="Codigo QR del dojo">
          <Text style={estilos.dato}>
            Imprime este codigo una sola vez y pegalo en la entrada. No caduca: la validacion de
            horario la hace el servidor en cada escaneo.
          </Text>
          {verQr ? (
            <>
              <View style={estilos.qr}>
                <QRCode value={codigos[0].token} size={200} backgroundColor="#FFFFFF" />
              </View>
              <Text style={estilos.dato}>{codigos[0].etiqueta}</Text>
              <Boton titulo="Ocultar" variante="texto" onPress={() => setVerQr(false)} />
            </>
          ) : (
            <Boton titulo="Mostrar QR para imprimir" onPress={() => setVerQr(true)} />
          )}
        </Tarjeta>
      )}

      {clases.length === 0 ? (
        <EstadoVacio
          icono="calendar-outline"
          titulo="Sin clases"
          detalle={
            soloPropias
              ? 'El maestro aun no te ha asignado clases.'
              : 'Crea una clase con horario antes de pasar lista.'
          }
        />
      ) : (
        <>
          <Tarjeta titulo="Pase de lista">
            <Selector
              etiqueta="Clase"
              opciones={clases.map((c) => ({ valor: c.id, etiqueta: c.nombre }))}
              valor={claseId}
              onCambiar={setClaseId}
              desplazable
            />
            {!!clase && <Text style={estilos.dato}>{resumirHorarios(clase.horarios)}</Text>}
            <Text style={estilos.dato}>
              {marcadosHoy.size} de {alumnos.length} presentes hoy ({hoy})
            </Text>
          </Tarjeta>

          <Tarjeta style={estilos.lista}>
            {alumnos.length === 0 ? (
              <EstadoVacio
                icono="people-outline"
                titulo="Sin alumnos inscritos"
                detalle="Asigna alumnos a esta clase desde su ficha."
              />
            ) : (
              alumnos.map((alumno, indice) => {
                const registro = marcadosHoy.get(alumno.id);
                const presente = !!registro;
                return (
                  <View key={alumno.id}>
                    {indice > 0 && <Separador />}
                    <Fila
                      titulo={`${alumno.nombre} ${alumno.apellido}`}
                      detalle={
                        registro
                          ? registro.origen === 'qr'
                            ? 'Marcado por QR'
                            : 'Marcado manualmente'
                          : 'Sin marcar'
                      }
                      derecha={
                        <Pressable
                          accessibilityRole="checkbox"
                          accessibilityState={{ checked: presente }}
                          accessibilityLabel={`Marcar a ${alumno.nombre}`}
                          onPress={() => alternar(alumno.id)}
                          style={[
                            estilos.marcado,
                            {
                              borderColor: presente ? tema.color.exito : tema.color.borde,
                              backgroundColor: presente ? tema.color.exito : 'transparent',
                            },
                          ]}
                        >
                          <Text
                            style={[
                              estilos.marcadoTexto,
                              { color: presente ? tema.color.textoSobreMarca : tema.color.textoTenue },
                            ]}
                          >
                            {presente ? '✓' : ''}
                          </Text>
                        </Pressable>
                      }
                    />
                  </View>
                );
              })
            )}
          </Tarjeta>

          <Tarjeta titulo="Marcadas hoy">
            {asistencias.length === 0 ? (
              <Text style={estilos.dato}>Nadie ha marcado todavia.</Text>
            ) : (
              asistencias.map((registro) => (
                <Fila
                  key={registro.id}
                  titulo={`${registro.alumno?.nombre ?? ''} ${registro.alumno?.apellido ?? ''}`}
                  detalle={new Date(registro.hora).toLocaleTimeString()}
                  derecha={
                    <Insignia
                      texto={registro.origen === 'qr' ? 'QR' : 'Manual'}
                      tono={registro.origen === 'qr' ? 'exito' : 'info'}
                    />
                  }
                />
              ))
            )}
          </Tarjeta>
        </>
      )}
    </Pantalla>
  );
}
