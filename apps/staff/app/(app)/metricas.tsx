import {
  ETIQUETA_ESTADO_LICENCIA,
  formatearMonto,
  totalesPlataforma,
  type EstadoLicencia,
  type MetricaDojo,
} from '@ossapp/core';
import { listarMetricas, useAuth } from '@ossapp/data';
import {
  EstadoVacio,
  Insignia,
  Pantalla,
  Tarjeta,
  espaciado,
  tipografia,
  useEstilos,
  type Tema,
  type TonoInsignia,
} from '@ossapp/ui';
import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

const TONO_LICENCIA: Record<EstadoLicencia, TonoInsignia> = {
  activa: 'exito',
  prueba: 'info',
  suspendida: 'advertencia',
  vencida: 'peligro',
};

const crearEstilos = (tema: Tema) =>
  StyleSheet.create({
    error: { ...tipografia.cuerpo, color: tema.color.peligro },
    rejilla: { flexDirection: 'row', flexWrap: 'wrap', gap: espaciado.md },
    celda: { minWidth: 100, flexGrow: 1, gap: 2 },
    numero: { ...tipografia.titulo, color: tema.color.primario },
    etiqueta: { ...tipografia.pie, color: tema.color.textoSecundario },
    filaDojo: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: espaciado.xs,
      gap: espaciado.sm,
    },
    dato: { ...tipografia.cuerpo, color: tema.color.texto },
    detalle: { ...tipografia.pie, color: tema.color.textoSecundario },
  });

function Dato({ valor, etiqueta }: { valor: string | number; etiqueta: string }) {
  const estilos = useEstilos(crearEstilos);
  return (
    <View style={estilos.celda}>
      <Text style={estilos.numero}>{valor}</Text>
      <Text style={estilos.etiqueta}>{etiqueta}</Text>
    </View>
  );
}

export default function Metricas() {
  const { perfil } = useAuth();
  const estilos = useEstilos(crearEstilos);
  const [metricas, setMetricas] = useState<MetricaDojo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refrescando, setRefrescando] = useState(false);

  const cargar = useCallback(async () => {
    setRefrescando(true);
    try {
      setMetricas(await listarMetricas());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar las metricas.');
    } finally {
      setRefrescando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  if (!perfil) return null;
  const totales = totalesPlataforma(metricas);

  return (
    <Pantalla titulo="Metricas" onRefrescar={cargar} refrescando={refrescando}>
      {!!error && <Text style={estilos.error}>{error}</Text>}

      {metricas.length === 0 ? (
        <EstadoVacio
          icono="stats-chart-outline"
          titulo="Sin datos"
          detalle="Las metricas globales solo estan disponibles para la plataforma."
        />
      ) : (
        <>
          <Tarjeta titulo="Plataforma">
            <View style={estilos.rejilla}>
              <Dato valor={totales.dojos} etiqueta="Dojos" />
              <Dato valor={totales.dojosActivos} etiqueta="Operando" />
              <Dato valor={totales.alumnos} etiqueta="Alumnos" />
              <Dato valor={totales.asistencias30d} etiqueta="Asistencias 30d" />
              <Dato valor={formatearMonto(totales.ingresosMes)} etiqueta="Cobrado este mes" />
              <Dato valor={totales.morosos} etiqueta="Sin pagar suscripcion" />
            </View>
          </Tarjeta>

          {metricas.map((metrica) => (
            <Tarjeta key={metrica.dojo_id} titulo={metrica.dojo}>
              <View style={estilos.filaDojo}>
                <Insignia
                  texto={ETIQUETA_ESTADO_LICENCIA[metrica.estado_licencia]}
                  tono={TONO_LICENCIA[metrica.estado_licencia]}
                />
                <Insignia
                  texto={metrica.suscripcion_al_dia ? 'Suscripcion al dia' : 'Suscripcion pendiente'}
                  tono={metrica.suscripcion_al_dia ? 'exito' : 'advertencia'}
                />
              </View>

              <View style={estilos.rejilla}>
                <Dato valor={metrica.alumnos_activos} etiqueta="Alumnos" />
                <Dato valor={metrica.clases_activas} etiqueta="Clases" />
                <Dato valor={metrica.usuarios} etiqueta="Usuarios" />
                <Dato valor={metrica.asistencias_30d} etiqueta="Asistencias 30d" />
              </View>

              <Text style={estilos.detalle}>
                Ingresos del dojo este mes: {formatearMonto(Number(metrica.ingresos_mes))}
                {metrica.licencia_vence_el ? ` · licencia hasta ${metrica.licencia_vence_el}` : ''}
              </Text>
            </Tarjeta>
          ))}
        </>
      )}
    </Pantalla>
  );
}
