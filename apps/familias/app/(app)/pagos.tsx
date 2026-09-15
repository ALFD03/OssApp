import {
  ETIQUETA_ESTADO_VERIFICACION,
  formatearMonto,
  nombrePeriodo,
  periodoDeMes,
  resumenSolvencia,
  tonoDeEstado,
  type AlumnoConDetalle,
  type PagoConDetalle,
  type PlanPago,
  type Solvencia,
} from '@ossapp/core';
import {
  listarAlumnos,
  listarPagos,
  listarPlanes,
  listarSolvencia,
  registrarPago,
  subirComprobante,
  useAuth,
} from '@ossapp/data';
import {
  Boton,
  Campo,
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
import * as ImagePicker from 'expo-image-picker';
import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

const crearEstilos = (tema: Tema) =>
  StyleSheet.create({
    error: { ...tipografia.cuerpo, color: tema.color.peligro },
    exito: { ...tipografia.cuerpo, color: tema.color.exito },
    dato: { ...tipografia.cuerpo, color: tema.color.textoSecundario },
    motivo: { ...tipografia.pie, color: tema.color.peligro },
    lista: { padding: 0, overflow: 'hidden' },
  });

export default function Pagos() {
  const { perfil } = useAuth();
  const estilos = useEstilos(crearEstilos);

  const [alumnos, setAlumnos] = useState<AlumnoConDetalle[]>([]);
  const [planes, setPlanes] = useState<PlanPago[]>([]);
  const [pagos, setPagos] = useState<PagoConDetalle[]>([]);
  const [solvencia, setSolvencia] = useState<Solvencia[]>([]);

  const [alumnoId, setAlumnoId] = useState<string | null>(null);
  const [planId, setPlanId] = useState<string | null>(null);
  const [periodo, setPeriodo] = useState(periodoDeMes());
  const [referencia, setReferencia] = useState('');
  const [comprobante, setComprobante] = useState<ImagePicker.ImagePickerAsset | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [refrescando, setRefrescando] = useState(false);

  const puedeSubir = perfil?.rol === 'representante';

  const cargar = useCallback(async () => {
    setRefrescando(true);
    try {
      const [mios, catalogo, registros, estados] = await Promise.all([
        listarAlumnos({ soloActivos: true }),
        listarPlanes(),
        listarPagos(),
        listarSolvencia(),
      ]);
      setAlumnos(mios);
      setPlanes(catalogo);
      setPagos(registros);
      setSolvencia(estados);
      setAlumnoId((actual) => actual ?? mios[0]?.id ?? null);
      setPlanId((actual) => actual ?? catalogo[0]?.id ?? null);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar los pagos.');
    } finally {
      setRefrescando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  async function elegirComprobante() {
    const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permiso.granted) {
      setError('Necesitamos acceso a tus fotos para adjuntar el comprobante.');
      return;
    }
    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
    });
    if (!resultado.canceled) {
      setComprobante(resultado.assets[0]);
      setError(null);
    }
  }

  async function enviar() {
    if (!perfil?.dojo_id || !alumnoId) return;
    if (!comprobante) {
      setError('Adjunta la foto del comprobante antes de enviar.');
      return;
    }

    const plan = planes.find((p) => p.id === planId);
    setGuardando(true);
    try {
      const ruta = await subirComprobante(perfil.dojo_id, alumnoId, {
        uri: comprobante.uri,
        nombre: comprobante.fileName ?? 'comprobante.jpg',
        tipo: comprobante.mimeType ?? 'image/jpeg',
      });

      await registrarPago({
        dojoId: perfil.dojo_id,
        alumnoId,
        planId: planId,
        periodo,
        monto: plan?.monto ?? 0,
        referencia: referencia.trim() || null,
        comprobanteUrl: ruta,
      });

      setComprobante(null);
      setReferencia('');
      setMensaje('Comprobante enviado. El maestro lo revisara y te avisara del resultado.');
      setError(null);
      await cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo enviar el comprobante.');
      setMensaje(null);
    } finally {
      setGuardando(false);
    }
  }

  if (!perfil) return null;

  return (
    <Pantalla titulo="Pagos" onRefrescar={cargar} refrescando={refrescando}>
      {!!error && <Text style={estilos.error}>{error}</Text>}
      {!!mensaje && <Text style={estilos.exito}>{mensaje}</Text>}

      <Tarjeta titulo="Estado de cuenta">
        {solvencia.length === 0 ? (
          <Text style={estilos.dato}>Sin informacion todavia.</Text>
        ) : (
          solvencia.map((estado) => (
            <Fila
              key={estado.alumno_id}
              titulo={`${estado.nombre} ${estado.apellido}`}
              detalle={resumenSolvencia(estado)}
              derecha={
                <Insignia
                  texto={estado.solvente ? 'Solvente' : 'Pendiente'}
                  tono={estado.solvente ? 'exito' : 'advertencia'}
                />
              }
            />
          ))
        )}
      </Tarjeta>

      {puedeSubir && alumnos.length > 0 && (
        <Tarjeta titulo="Subir comprobante">
          {alumnos.length > 1 && (
            <Selector
              etiqueta="Alumno"
              opciones={alumnos.map((a) => ({ valor: a.id, etiqueta: `${a.nombre} ${a.apellido}` }))}
              valor={alumnoId}
              onCambiar={setAlumnoId}
              desplazable
            />
          )}

          {planes.length > 0 && (
            <Selector
              etiqueta="Plan"
              opciones={planes.map((p) => ({
                valor: p.id,
                etiqueta: `${p.nombre} · ${formatearMonto(p.monto, p.moneda)}`,
              }))}
              valor={planId}
              onCambiar={setPlanId}
              desplazable
            />
          )}

          <Selector
            etiqueta="Periodo"
            opciones={[-1, 0, 1].map((desplazamiento) => {
              const valor = periodoDeMes(new Date(), desplazamiento);
              return { valor, etiqueta: nombrePeriodo(valor) };
            })}
            valor={periodo}
            onCambiar={setPeriodo}
            desplazable
          />

          <Campo
            etiqueta="Referencia"
            value={referencia}
            onChangeText={setReferencia}
            placeholder="Numero de transferencia (opcional)"
            autoCapitalize="characters"
          />

          <Text style={estilos.dato}>
            {comprobante ? 'Comprobante adjunto.' : 'Sin comprobante adjunto.'}
          </Text>
          <Boton
            titulo={comprobante ? 'Cambiar comprobante' : 'Adjuntar comprobante'}
            variante="secundario"
            onPress={elegirComprobante}
          />
          <Boton titulo="Enviar para verificacion" onPress={enviar} cargando={guardando} />
        </Tarjeta>
      )}

      <Tarjeta titulo="Historial" style={estilos.lista}>
        {pagos.length === 0 ? (
          <EstadoVacio
            icono="card-outline"
            titulo="Sin pagos registrados"
            detalle={
              puedeSubir
                ? 'Sube el comprobante de tu primera mensualidad.'
                : 'Tu representante vera aqui los pagos.'
            }
          />
        ) : (
          pagos.map((pago, indice) => (
            <View key={pago.id}>
              {indice > 0 && <Separador />}
              <Fila
                titulo={nombrePeriodo(pago.periodo)}
                inicial={pago.alumno?.nombre ?? '?'}
                detalle={`${pago.alumno?.nombre ?? ''} · ${formatearMonto(
                  Number(pago.monto),
                  pago.moneda,
                )}${pago.referencia ? ` · ${pago.referencia}` : ''}`}
                derecha={
                  <Insignia
                    texto={ETIQUETA_ESTADO_VERIFICACION[pago.estado]}
                    tono={tonoDeEstado(pago.estado)}
                  />
                }
              />
              {pago.estado === 'rechazado' && !!pago.motivo_rechazo && (
                <Text style={estilos.motivo}>Motivo: {pago.motivo_rechazo}</Text>
              )}
            </View>
          ))
        )}
      </Tarjeta>
    </Pantalla>
  );
}
