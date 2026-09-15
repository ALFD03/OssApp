import {
  ETIQUETA_ESTADO_VERIFICACION,
  formatearMonto,
  nombrePeriodo,
  puede,
  resumenSolvencia,
  tonoDeEstado,
  type PagoConDetalle,
  type Solvencia,
} from '@ossapp/core';
import {
  ingresosPorPeriodo,
  listarPagos,
  listarSolvencia,
  urlDeComprobante,
  useAuth,
  verificarPago,
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

const crearEstilos = (tema: Tema) =>
  StyleSheet.create({
    error: { ...tipografia.cuerpo, color: tema.color.peligro },
    dato: { ...tipografia.cuerpo, color: tema.color.textoSecundario },
    lista: { padding: 0, overflow: 'hidden' },
    acciones: { flexDirection: 'row', gap: espaciado.sm, padding: espaciado.lg, paddingTop: 0 },
    accion: { flex: 1 },
    total: { ...tipografia.subtitulo, color: tema.color.exito },
  });

type Vista = 'pendientes' | 'solvencia' | 'ingresos';

export default function Pagos() {
  const { perfil } = useAuth();
  const estilos = useEstilos(crearEstilos);

  const [vista, setVista] = useState<Vista>('pendientes');
  const [pendientes, setPendientes] = useState<PagoConDetalle[]>([]);
  const [solvencia, setSolvencia] = useState<Solvencia[]>([]);
  const [ingresos, setIngresos] = useState<{ periodo: string; total: number }[]>([]);
  const [rechazando, setRechazando] = useState<string | null>(null);
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [refrescando, setRefrescando] = useState(false);

  const cargar = useCallback(async () => {
    if (!perfil) return;
    setRefrescando(true);
    try {
      const [cola, estados, totales] = await Promise.all([
        listarPagos({ estado: 'pendiente' }),
        listarSolvencia(),
        puede(perfil.rol, 'pagos.reportes.ver') ? ingresosPorPeriodo() : Promise.resolve([]),
      ]);
      setPendientes(cola);
      setSolvencia(estados);
      setIngresos(totales);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar los pagos.');
    } finally {
      setRefrescando(false);
    }
  }, [perfil]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  if (!perfil) return null;
  const puedeVerificar = puede(perfil.rol, 'pagos.verificar');

  async function verComprobante(ruta: string | null) {
    if (!ruta) {
      setError('Este pago no tiene comprobante adjunto.');
      return;
    }
    // El bucket es privado: hace falta una URL firmada de corta duracion.
    const url = await urlDeComprobante(ruta);
    if (url) await Linking.openURL(url);
    else setError('No se pudo abrir el comprobante.');
  }

  async function resolver(id: string, aprobar: boolean) {
    try {
      if (aprobar) {
        await verificarPago(id, { aprobar: true });
      } else {
        if (!motivo.trim()) {
          setError('Indica el motivo del rechazo: la familia necesita saber que corregir.');
          return;
        }
        await verificarPago(id, { aprobar: false, motivo: motivo.trim() });
        setRechazando(null);
        setMotivo('');
      }
      setError(null);
      await cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo registrar la decision.');
    }
  }

  return (
    <Pantalla titulo="Pagos" onRefrescar={cargar} refrescando={refrescando}>
      {!!error && <Text style={estilos.error}>{error}</Text>}

      <Selector
        opciones={[
          { valor: 'pendientes' as const, etiqueta: `Por verificar (${pendientes.length})` },
          { valor: 'solvencia' as const, etiqueta: 'Solvencia' },
          ...(puede(perfil.rol, 'pagos.reportes.ver')
            ? [{ valor: 'ingresos' as const, etiqueta: 'Ingresos' }]
            : []),
        ]}
        valor={vista}
        onCambiar={setVista}
        desplazable
      />

      {vista === 'pendientes' && (
        <Tarjeta style={estilos.lista}>
          {pendientes.length === 0 ? (
            <EstadoVacio
              icono="checkmark-circle-outline"
              titulo="Nada por verificar"
              detalle="Los comprobantes que suban las familias apareceran aqui."
            />
          ) : (
            pendientes.map((pago, indice) => (
              <View key={pago.id}>
                {indice > 0 && <Separador />}
                <Fila
                  titulo={`${pago.alumno?.nombre ?? ''} ${pago.alumno?.apellido ?? ''}`}
                  detalle={`${nombrePeriodo(pago.periodo)} · ${formatearMonto(
                    Number(pago.monto),
                    pago.moneda,
                  )}${pago.referencia ? ` · ${pago.referencia}` : ''}`}
                  derecha={
                    <Insignia
                      texto={ETIQUETA_ESTADO_VERIFICACION[pago.estado]}
                      tono={tonoDeEstado(pago.estado)}
                    />
                  }
                  onPress={() => verComprobante(pago.comprobante_url)}
                />

                {puedeVerificar && (
                  <>
                    {rechazando === pago.id ? (
                      <View style={{ paddingHorizontal: espaciado.lg }}>
                        <Campo
                          etiqueta="Motivo del rechazo"
                          value={motivo}
                          onChangeText={setMotivo}
                          placeholder="Comprobante ilegible, monto incorrecto..."
                          multiline
                        />
                        <View style={estilos.acciones}>
                          <Boton
                            titulo="Confirmar rechazo"
                            style={estilos.accion}
                            onPress={() => resolver(pago.id, false)}
                          />
                          <Boton
                            titulo="Cancelar"
                            variante="texto"
                            style={estilos.accion}
                            onPress={() => {
                              setRechazando(null);
                              setMotivo('');
                            }}
                          />
                        </View>
                      </View>
                    ) : (
                      <View style={estilos.acciones}>
                        <Boton
                          titulo="Aprobar"
                          style={estilos.accion}
                          onPress={() => resolver(pago.id, true)}
                        />
                        <Boton
                          titulo="Rechazar"
                          variante="secundario"
                          style={estilos.accion}
                          onPress={() => setRechazando(pago.id)}
                        />
                      </View>
                    )}
                  </>
                )}
              </View>
            ))
          )}
        </Tarjeta>
      )}

      {vista === 'solvencia' && (
        <Tarjeta style={estilos.lista}>
          {solvencia.length === 0 ? (
            <EstadoVacio icono="people-outline" titulo="Sin alumnos activos" />
          ) : (
            solvencia.map((estado, indice) => (
              <View key={estado.alumno_id}>
                {indice > 0 && <Separador />}
                <Fila
                  titulo={`${estado.nombre} ${estado.apellido}`}
                  detalle={resumenSolvencia(estado)}
                  derecha={
                    <Insignia
                      texto={estado.solvente ? 'Solvente' : 'Debe'}
                      tono={estado.solvente ? 'exito' : 'peligro'}
                    />
                  }
                />
              </View>
            ))
          )}
        </Tarjeta>
      )}

      {vista === 'ingresos' && (
        <Tarjeta titulo="Ingresos aprobados por periodo">
          {ingresos.length === 0 ? (
            <Text style={estilos.dato}>Todavia no hay pagos aprobados.</Text>
          ) : (
            <>
              {ingresos.map((fila) => (
                <Fila
                  key={fila.periodo}
                  titulo={nombrePeriodo(fila.periodo)}
                  inicial={fila.periodo.slice(5, 7)}
                  derecha={<Text style={estilos.total}>{formatearMonto(fila.total)}</Text>}
                />
              ))}
              <Text style={estilos.dato}>
                Solo se suman los pagos aprobados. Los pendientes no cuentan como ingreso.
              </Text>
            </>
          )}
        </Tarjeta>
      )}
    </Pantalla>
  );
}
