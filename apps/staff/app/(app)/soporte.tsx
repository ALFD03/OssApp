import {
  ETIQUETA_ESTADO_TICKET,
  ETIQUETA_ESTADO_VERIFICACION,
  formatearMonto,
  haceCuanto,
  nombrePeriodo,
  periodoDeMes,
  tonoDeEstado,
  type Suscripcion,
  type Ticket,
} from '@ossapp/core';
import {
  abrirTicket,
  listarSuscripciones,
  listarTickets,
  responderTicket,
  subirSuscripcion,
  urlDeComprobante,
  useAuth,
  verificarSuscripcion,
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
  espaciado,
  tipografia,
  useEstilos,
  type Tema,
} from '@ossapp/ui';
import React, { useCallback, useEffect, useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';

type ConDojo<T> = T & { dojo: { id: string; nombre: string } | null };

const crearEstilos = (tema: Tema) =>
  StyleSheet.create({
    error: { ...tipografia.cuerpo, color: tema.color.peligro },
    exito: { ...tipografia.cuerpo, color: tema.color.exito },
    dato: { ...tipografia.cuerpo, color: tema.color.textoSecundario },
    meta: { ...tipografia.pie, color: tema.color.textoTenue },
    lista: { padding: 0, overflow: 'hidden' },
    acciones: { flexDirection: 'row', gap: espaciado.sm, padding: espaciado.lg, paddingTop: 0 },
    accion: { flex: 1 },
  });

/**
 * Dos caras de la misma pantalla:
 *   - superadmin: bandeja de tickets y verificacion de suscripciones;
 *   - maestro: su propia licencia y abrir tickets a la plataforma.
 */
export default function Soporte() {
  const { perfil } = useAuth();
  const estilos = useEstilos(crearEstilos);

  const [tickets, setTickets] = useState<ConDojo<Ticket>[]>([]);
  const [suscripciones, setSuscripciones] = useState<ConDojo<Suscripcion>[]>([]);
  const [vista, setVista] = useState<'tickets' | 'suscripciones'>('tickets');

  const [asunto, setAsunto] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [respondiendo, setRespondiendo] = useState<string | null>(null);
  const [respuesta, setRespuesta] = useState('');
  const [rechazando, setRechazando] = useState<string | null>(null);
  const [motivo, setMotivo] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [refrescando, setRefrescando] = useState(false);

  const esSuperadmin = perfil?.rol === 'superadmin';

  const cargar = useCallback(async () => {
    setRefrescando(true);
    try {
      const [bandeja, pagos] = await Promise.all([listarTickets(), listarSuscripciones()]);
      setTickets(bandeja);
      setSuscripciones(pagos);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar el soporte.');
    } finally {
      setRefrescando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  if (!perfil) return null;

  async function crear() {
    if (!asunto.trim() || !descripcion.trim()) {
      setError('El asunto y la descripcion son obligatorios.');
      return;
    }
    if (!perfil?.dojo_id) return;

    setGuardando(true);
    try {
      await abrirTicket(perfil.dojo_id, asunto.trim(), descripcion.trim());
      setAsunto('');
      setDescripcion('');
      setMensaje('Ticket enviado. La plataforma te respondera por aqui.');
      setError(null);
      await cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo abrir el ticket.');
    } finally {
      setGuardando(false);
    }
  }

  async function responder(id: string, estado: Ticket['estado']) {
    if (!respuesta.trim()) {
      setError('Escribe una respuesta antes de cerrar el ticket.');
      return;
    }
    try {
      await responderTicket(id, respuesta.trim(), estado);
      setRespondiendo(null);
      setRespuesta('');
      setError(null);
      await cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo responder.');
    }
  }

  async function resolverSuscripcion(id: string, aprobar: boolean) {
    try {
      if (aprobar) {
        await verificarSuscripcion(id, { aprobar: true });
        setMensaje('Suscripcion aprobada. La licencia del dojo queda renovada.');
      } else {
        if (!motivo.trim()) {
          setError('Indica el motivo del rechazo.');
          return;
        }
        await verificarSuscripcion(id, { aprobar: false, motivo: motivo.trim() });
        setRechazando(null);
        setMotivo('');
      }
      setError(null);
      await cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo registrar la decision.');
    }
  }

  async function pagarSuscripcion() {
    if (!perfil?.dojo_id) return;
    setGuardando(true);
    try {
      await subirSuscripcion({ dojoId: perfil.dojo_id, periodo: periodoDeMes(), monto: 49 });
      setMensaje('Comprobante de suscripcion enviado para verificacion.');
      setError(null);
      await cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo registrar la suscripcion.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Pantalla
      titulo={esSuperadmin ? 'Soporte' : 'Soporte y licencia'}
      onRefrescar={cargar}
      refrescando={refrescando}
    >
      {!!error && <Text style={estilos.error}>{error}</Text>}
      {!!mensaje && <Text style={estilos.exito}>{mensaje}</Text>}

      {esSuperadmin && (
        <Selector
          opciones={[
            {
              valor: 'tickets' as const,
              etiqueta: `Tickets (${tickets.filter((t) => t.estado !== 'cerrado').length})`,
            },
            {
              valor: 'suscripciones' as const,
              etiqueta: `Suscripciones (${suscripciones.filter((s) => s.estado === 'pendiente').length})`,
            },
          ]}
          valor={vista}
          onCambiar={setVista}
        />
      )}

      {!esSuperadmin && (
        <>
          <Tarjeta titulo="Suscripcion del dojo">
            {suscripciones.length === 0 ? (
              <Text style={estilos.dato}>Todavia no hay pagos de suscripcion registrados.</Text>
            ) : (
              suscripciones.map((suscripcion) => (
                <Fila
                  key={suscripcion.id}
                  titulo={nombrePeriodo(suscripcion.periodo)}
                  inicial={suscripcion.periodo.slice(5, 7)}
                  detalle={formatearMonto(Number(suscripcion.monto), suscripcion.moneda)}
                  derecha={
                    <Insignia
                      texto={ETIQUETA_ESTADO_VERIFICACION[suscripcion.estado]}
                      tono={tonoDeEstado(suscripcion.estado)}
                    />
                  }
                />
              ))
            )}
            <Boton
              titulo="Registrar pago de este mes"
              variante="secundario"
              onPress={pagarSuscripcion}
              cargando={guardando}
            />
          </Tarjeta>

          <Tarjeta titulo="Abrir un ticket">
            <Campo etiqueta="Asunto" value={asunto} onChangeText={setAsunto} />
            <Campo
              etiqueta="Descripcion"
              value={descripcion}
              onChangeText={setDescripcion}
              multiline
              placeholder="Cuentanos que ocurre y en que pantalla"
            />
            <Boton titulo="Enviar a la plataforma" onPress={crear} cargando={guardando} />
          </Tarjeta>
        </>
      )}

      {(!esSuperadmin || vista === 'tickets') && (
        <Tarjeta titulo={esSuperadmin ? 'Bandeja de soporte' : 'Mis tickets'} style={estilos.lista}>
          {tickets.length === 0 ? (
            <EstadoVacio
              icono="help-buoy-outline"
              titulo="Sin tickets"
              detalle={esSuperadmin ? 'Nada pendiente de los dojos.' : 'No has abierto ninguno.'}
            />
          ) : (
            tickets.map((ticket, indice) => (
              <View key={ticket.id}>
                {indice > 0 && <Separador />}
                <Fila
                  titulo={ticket.asunto}
                  inicial={ticket.dojo?.nombre ?? '?'}
                  detalle={`${esSuperadmin ? `${ticket.dojo?.nombre ?? ''} · ` : ''}${haceCuanto(
                    ticket.creado_el,
                  )}`}
                  derecha={
                    <Insignia
                      texto={ETIQUETA_ESTADO_TICKET[ticket.estado]}
                      tono={
                        ticket.estado === 'cerrado'
                          ? 'exito'
                          : ticket.estado === 'en_proceso'
                            ? 'info'
                            : 'advertencia'
                      }
                    />
                  }
                  onPress={esSuperadmin ? () => setRespondiendo(ticket.id) : undefined}
                />
                <Text style={[estilos.dato, { paddingHorizontal: espaciado.lg }]}>
                  {ticket.descripcion}
                </Text>
                {!!ticket.respuesta && (
                  <Text style={[estilos.meta, { paddingHorizontal: espaciado.lg }]}>
                    Respuesta: {ticket.respuesta}
                  </Text>
                )}

                {esSuperadmin && respondiendo === ticket.id && (
                  <View style={{ paddingHorizontal: espaciado.lg }}>
                    <Campo
                      etiqueta="Respuesta"
                      value={respuesta}
                      onChangeText={setRespuesta}
                      multiline
                    />
                    <View style={estilos.acciones}>
                      <Boton
                        titulo="Responder"
                        style={estilos.accion}
                        onPress={() => responder(ticket.id, 'en_proceso')}
                      />
                      <Boton
                        titulo="Cerrar"
                        variante="secundario"
                        style={estilos.accion}
                        onPress={() => responder(ticket.id, 'cerrado')}
                      />
                    </View>
                  </View>
                )}
              </View>
            ))
          )}
        </Tarjeta>
      )}

      {esSuperadmin && vista === 'suscripciones' && (
        <Tarjeta style={estilos.lista}>
          {suscripciones.length === 0 ? (
            <EstadoVacio icono="card-outline" titulo="Sin suscripciones registradas" />
          ) : (
            suscripciones.map((suscripcion, indice) => (
              <View key={suscripcion.id}>
                {indice > 0 && <Separador />}
                <Fila
                  titulo={suscripcion.dojo?.nombre ?? 'Dojo'}
                  detalle={`${nombrePeriodo(suscripcion.periodo)} · ${formatearMonto(
                    Number(suscripcion.monto),
                    suscripcion.moneda,
                  )}`}
                  derecha={
                    <Insignia
                      texto={ETIQUETA_ESTADO_VERIFICACION[suscripcion.estado]}
                      tono={tonoDeEstado(suscripcion.estado)}
                    />
                  }
                  onPress={
                    suscripcion.comprobante_url
                      ? async () => {
                          const url = await urlDeComprobante(suscripcion.comprobante_url ?? '');
                          if (url) await Linking.openURL(url);
                          else setError('No se pudo abrir el comprobante.');
                        }
                      : undefined
                  }
                />
                {suscripcion.estado === 'pendiente' &&
                  (rechazando === suscripcion.id ? (
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
                          onPress={() => resolverSuscripcion(suscripcion.id, false)}
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
                        titulo="Aprobar y renovar"
                        style={estilos.accion}
                        onPress={() => resolverSuscripcion(suscripcion.id, true)}
                      />
                      <Boton
                        titulo="Rechazar"
                        variante="secundario"
                        style={estilos.accion}
                        onPress={() => setRechazando(suscripcion.id)}
                      />
                    </View>
                  ))}
              </View>
            ))
          )}
        </Tarjeta>
      )}
    </Pantalla>
  );
}
