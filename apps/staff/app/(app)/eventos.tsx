import {
  ETIQUETA_ESTADO_VERIFICACION,
  ETIQUETA_TIPO_EVENTO,
  TIPOS_EVENTO,
  esGratuito,
  formatearMonto,
  puede,
  resumenFechaEvento,
  tonoDeEstado,
  type Evento,
  type InscripcionConDetalle,
  type TipoEvento,
} from '@ossapp/core';
import {
  crearEvento,
  listarEventos,
  listarInscripciones,
  urlDeComprobante,
  useAuth,
  verificarInscripcion,
} from '@ossapp/data';
import {
  Boton,
  BotonFlotante,
  Campo,
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
import { Linking, StyleSheet, Text, View } from 'react-native';

const crearEstilos = (tema: Tema) =>
  StyleSheet.create({
    error: { ...tipografia.cuerpo, color: tema.color.peligro },
    dato: { ...tipografia.cuerpo, color: tema.color.textoSecundario },
    meta: { ...tipografia.pie, color: tema.color.textoTenue },
    lista: { padding: 0, overflow: 'hidden' },
    fila: { flexDirection: 'row', gap: espaciado.sm, flexWrap: 'wrap' },
    acciones: { flexDirection: 'row', gap: espaciado.sm, padding: espaciado.lg, paddingTop: 0 },
    accion: { flex: 1 },
  });

const FECHA_ISO = /^\d{4}-\d{2}-\d{2}$/;

export default function Eventos() {
  const { perfil } = useAuth();
  const estilos = useEstilos(crearEstilos);

  const [eventos, setEventos] = useState<Evento[]>([]);
  const [inscripciones, setInscripciones] = useState<InscripcionConDetalle[]>([]);
  const [formulario, setFormulario] = useState(false);

  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState<TipoEvento>('torneo');
  const [fecha, setFecha] = useState('');
  const [lugar, setLugar] = useState('');
  const [cupo, setCupo] = useState('');
  const [costo, setCosto] = useState('0');

  const [rechazando, setRechazando] = useState<string | null>(null);
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [refrescando, setRefrescando] = useState(false);

  const cargar = useCallback(async () => {
    setRefrescando(true);
    try {
      const [cartelera, todas] = await Promise.all([listarEventos(), listarInscripciones()]);
      setEventos(cartelera);
      setInscripciones(todas);
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

  if (!perfil) return null;
  const puedeGestionar = puede(perfil.rol, 'eventos.gestionar');

  async function guardar() {
    if (!nombre.trim()) {
      setError('El evento necesita un nombre.');
      return;
    }
    if (!FECHA_ISO.test(fecha.trim())) {
      setError('La fecha debe tener el formato AAAA-MM-DD.');
      return;
    }
    if (!perfil?.dojo_id) return;

    setGuardando(true);
    try {
      await crearEvento(perfil.dojo_id, {
        nombre: nombre.trim(),
        tipo,
        fecha: fecha.trim(),
        lugar: lugar.trim() || null,
        cupo: cupo.trim() ? Number(cupo) : null,
        costo: Number(costo) || 0,
      });
      setNombre('');
      setFecha('');
      setLugar('');
      setCupo('');
      setCosto('0');
      setFormulario(false);
      setError(null);
      await cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo crear el evento.');
    } finally {
      setGuardando(false);
    }
  }

  async function resolver(id: string, aprobar: boolean) {
    try {
      if (aprobar) {
        await verificarInscripcion(id, { aprobar: true });
      } else {
        if (!motivo.trim()) {
          setError('Indica el motivo del rechazo.');
          return;
        }
        await verificarInscripcion(id, { aprobar: false, motivo: motivo.trim() });
        setRechazando(null);
        setMotivo('');
      }
      setError(null);
      await cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo registrar la decision.');
    }
  }

  const pendientes = inscripciones.filter((i) => i.estado === 'pendiente');

  return (
    <>
      <Pantalla titulo="Eventos" onRefrescar={cargar} refrescando={refrescando}>
        {!!error && <Text style={estilos.error}>{error}</Text>}

        {formulario && puedeGestionar && (
          <Tarjeta titulo="Nuevo evento">
            <Campo etiqueta="Nombre" value={nombre} onChangeText={setNombre} placeholder="Torneo interdojo" />
            <Selector
              etiqueta="Tipo"
              opciones={TIPOS_EVENTO.map((valor) => ({
                valor,
                etiqueta: ETIQUETA_TIPO_EVENTO[valor],
              }))}
              valor={tipo}
              onCambiar={setTipo}
              desplazable
            />
            <Campo
              etiqueta="Fecha"
              value={fecha}
              onChangeText={setFecha}
              placeholder="2026-11-15"
              autoCapitalize="none"
            />
            <Campo etiqueta="Lugar" value={lugar} onChangeText={setLugar} placeholder="Dojo principal" />
            <Campo
              etiqueta="Cupo (vacio = sin limite)"
              value={cupo}
              onChangeText={setCupo}
              keyboardType="number-pad"
            />
            <Campo
              etiqueta="Costo (0 = gratuito)"
              value={costo}
              onChangeText={setCosto}
              keyboardType="decimal-pad"
            />
            <Boton titulo="Crear evento" onPress={guardar} cargando={guardando} />
            <Boton titulo="Cancelar" variante="texto" onPress={() => setFormulario(false)} />
          </Tarjeta>
        )}

        {puedeGestionar && pendientes.length > 0 && (
          <Tarjeta titulo={`Inscripciones por verificar (${pendientes.length})`} style={estilos.lista}>
            {pendientes.map((inscripcion, indice) => (
              <View key={inscripcion.id}>
                {indice > 0 && <Separador />}
                <Fila
                  titulo={`${inscripcion.alumno?.nombre ?? ''} ${inscripcion.alumno?.apellido ?? ''}`}
                  detalle={inscripcion.evento?.nombre ?? 'Evento'}
                  derecha={
                    <Insignia
                      texto={ETIQUETA_ESTADO_VERIFICACION[inscripcion.estado]}
                      tono={tonoDeEstado(inscripcion.estado)}
                    />
                  }
                  onPress={
                    inscripcion.comprobante_url
                      ? async () => {
                          const url = await urlDeComprobante(inscripcion.comprobante_url ?? '');
                          if (url) await Linking.openURL(url);
                          else setError('No se pudo abrir el comprobante.');
                        }
                      : undefined
                  }
                />
                {rechazando === inscripcion.id ? (
                  <View style={{ paddingHorizontal: espaciado.lg }}>
                    <Campo
                      etiqueta="Motivo del rechazo"
                      value={motivo}
                      onChangeText={setMotivo}
                      multiline
                    />
                    <View style={estilos.acciones}>
                      <Boton
                        titulo="Confirmar"
                        style={estilos.accion}
                        onPress={() => resolver(inscripcion.id, false)}
                      />
                      <Boton
                        titulo="Cancelar"
                        variante="texto"
                        style={estilos.accion}
                        onPress={() => setRechazando(null)}
                      />
                    </View>
                  </View>
                ) : (
                  <View style={estilos.acciones}>
                    <Boton
                      titulo="Aprobar"
                      style={estilos.accion}
                      onPress={() => resolver(inscripcion.id, true)}
                    />
                    <Boton
                      titulo="Rechazar"
                      variante="secundario"
                      style={estilos.accion}
                      onPress={() => setRechazando(inscripcion.id)}
                    />
                  </View>
                )}
              </View>
            ))}
          </Tarjeta>
        )}

        {eventos.length === 0 ? (
          <EstadoVacio
            icono="calendar-outline"
            titulo="Sin eventos"
            detalle={
              puedeGestionar
                ? 'Crea un torneo o seminario para que las familias puedan inscribirse.'
                : 'El maestro aun no ha programado eventos.'
            }
          />
        ) : (
          eventos.map((evento) => {
            const delEvento = inscripciones.filter((i) => i.evento_id === evento.id);
            return (
              <Tarjeta key={evento.id} titulo={evento.nombre}>
                <View style={estilos.fila}>
                  <Insignia texto={ETIQUETA_TIPO_EVENTO[evento.tipo]} tono="acento" />
                  {esGratuito(evento) ? (
                    <Insignia texto="Gratuito" tono="exito" />
                  ) : (
                    <Insignia
                      texto={formatearMonto(Number(evento.costo), evento.moneda)}
                      tono="info"
                    />
                  )}
                </View>
                <Text style={estilos.dato}>{resumenFechaEvento(evento)}</Text>
                {!!evento.lugar && <Text style={estilos.dato}>{evento.lugar}</Text>}
                <Text style={estilos.meta}>
                  {evento.cupo === null
                    ? `${evento.inscritos} inscritos · sin limite`
                    : `${evento.inscritos} de ${evento.cupo} plazas · ${evento.plazas_libres} libres`}
                </Text>

                {delEvento.length > 0 && (
                  <View>
                    {delEvento.map((inscripcion) => (
                      <Fila
                        key={inscripcion.id}
                        titulo={`${inscripcion.alumno?.nombre ?? ''} ${inscripcion.alumno?.apellido ?? ''}`}
                        derecha={
                          <Insignia
                            texto={ETIQUETA_ESTADO_VERIFICACION[inscripcion.estado]}
                            tono={tonoDeEstado(inscripcion.estado)}
                          />
                        }
                      />
                    ))}
                  </View>
                )}
              </Tarjeta>
            );
          })
        )}
      </Pantalla>

      {puedeGestionar && !formulario && (
        <BotonFlotante titulo="Nuevo evento" onPress={() => setFormulario(true)} />
      )}
    </>
  );
}
