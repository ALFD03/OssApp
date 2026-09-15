import {
  ESTADOS_LICENCIA,
  ETIQUETA_ESTADO_LICENCIA,
  ETIQUETA_ROL,
  licenciaPermiteOperar,
  type Dojo,
  type EstadoLicencia,
} from '@ossapp/core';
import { cambiarLicencia, contarUsuariosPorRol, listarDojos, useAuth } from '@ossapp/data';
import {
  Boton,
  EnConstruccion,
  Insignia,
  Pantalla,
  Selector,
  Tarjeta,
  espaciado,
  tipografia,
  useEstilos,
  type Tema,
  type TonoInsignia,
} from '@ossapp/ui';
import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

export const TONO_LICENCIA: Record<EstadoLicencia, TonoInsignia> = {
  activa: 'exito',
  prueba: 'info',
  suspendida: 'advertencia',
  vencida: 'peligro',
};

const crearEstilos = (tema: Tema) =>
  StyleSheet.create({
    saludo: { ...tipografia.titulo, color: tema.color.texto },
    subtitulo: { ...tipografia.cuerpo, color: tema.color.textoSecundario },
    fila: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: espaciado.xs,
      gap: espaciado.md,
    },
    dato: { ...tipografia.cuerpo, color: tema.color.texto, flexShrink: 1 },
    numero: { ...tipografia.subtitulo, color: tema.color.primario },
    aviso: { ...tipografia.pie, color: tema.color.advertencia },
    error: { ...tipografia.cuerpo, color: tema.color.peligro },
    vacio: { ...tipografia.cuerpo, color: tema.color.textoSecundario },
    pie: { ...tipografia.pie, color: tema.color.textoTenue, marginTop: espaciado.xs },
  });

export default function Inicio() {
  const { perfil } = useAuth();
  const estilos = useEstilos(crearEstilos);
  const [dojos, setDojos] = useState<Dojo[]>([]);
  const [conteo, setConteo] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [refrescando, setRefrescando] = useState(false);
  const [editando, setEditando] = useState<string | null>(null);

  async function cambiar(dojoId: string, estado: EstadoLicencia) {
    try {
      // Suspender o reactivar a mano, al margen del cobro de la suscripcion.
      await cambiarLicencia(dojoId, estado);
      setEditando(null);
      await cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cambiar la licencia.');
    }
  }

  const cargar = useCallback(async () => {
    if (!perfil) return;
    setRefrescando(true);
    try {
      // Ambas consultas llegan sin filtro de dojo: lo aplica RLS en el servidor.
      // El superadmin recibe todos los dojos; maestro y sensei, solo el suyo.
      const [listado, conteos] = await Promise.all([listarDojos(), contarUsuariosPorRol()]);
      setDojos(listado);
      setConteo(conteos);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar los datos.');
    } finally {
      setRefrescando(false);
    }
  }, [perfil]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  if (!perfil) return null;

  const esSuperadmin = perfil.rol === 'superadmin';

  return (
    <Pantalla onRefrescar={cargar} refrescando={refrescando}>
      <View>
        <Text style={estilos.saludo}>Oss, {perfil.nombre}</Text>
        <Text style={estilos.subtitulo}>
          {ETIQUETA_ROL[perfil.rol]}
          {perfil.dojo ? ` · ${perfil.dojo.nombre}` : ' · Plataforma'}
        </Text>
      </View>

      {!!error && <Text style={estilos.error}>{error}</Text>}

      {perfil.dojo && (
        <Tarjeta titulo="Estado del dojo">
          <View style={estilos.fila}>
            <Text style={estilos.dato}>{perfil.dojo.nombre}</Text>
            <Insignia
              texto={ETIQUETA_ESTADO_LICENCIA[perfil.dojo.estado_licencia]}
              tono={TONO_LICENCIA[perfil.dojo.estado_licencia]}
            />
          </View>
          {!licenciaPermiteOperar(perfil.dojo.estado_licencia) && (
            <Text style={estilos.aviso}>
              La licencia no esta activa. Contacta a la plataforma para regularizarla.
            </Text>
          )}
        </Tarjeta>
      )}

      <Tarjeta titulo={esSuperadmin ? 'Usuarios de la plataforma' : 'Personas en tu dojo'}>
        {Object.keys(conteo).length === 0 ? (
          <Text style={estilos.vacio}>Sin datos todavia.</Text>
        ) : (
          Object.entries(conteo).map(([rol, total]) => (
            <View key={rol} style={estilos.fila}>
              <Text style={estilos.dato}>
                {ETIQUETA_ROL[rol as keyof typeof ETIQUETA_ROL] ?? rol}
              </Text>
              <Text style={estilos.numero}>{total}</Text>
            </View>
          ))
        )}
      </Tarjeta>

      <Tarjeta titulo={esSuperadmin ? 'Dojos de la plataforma' : 'Dojo visible para ti'}>
        {dojos.map((dojo) => (
          <View key={dojo.id}>
            <View style={estilos.fila}>
              <Text style={estilos.dato}>{dojo.nombre}</Text>
              <Insignia
                texto={ETIQUETA_ESTADO_LICENCIA[dojo.estado_licencia]}
                tono={TONO_LICENCIA[dojo.estado_licencia]}
              />
            </View>

            {esSuperadmin &&
              (editando === dojo.id ? (
                <Selector
                  etiqueta="Estado de la licencia"
                  opciones={ESTADOS_LICENCIA.map((valor) => ({
                    valor,
                    etiqueta: ETIQUETA_ESTADO_LICENCIA[valor],
                  }))}
                  valor={dojo.estado_licencia}
                  onCambiar={(estado: EstadoLicencia) => cambiar(dojo.id, estado)}
                  desplazable
                />
              ) : (
                <Boton
                  titulo="Cambiar licencia"
                  variante="texto"
                  onPress={() => setEditando(dojo.id)}
                />
              ))}

            {!!dojo.licencia_vence_el && (
              <Text style={estilos.pie}>Vence el {dojo.licencia_vence_el}</Text>
            )}
          </View>
        ))}
        <Text style={estilos.pie}>
          {dojos.length === 1
            ? 'Solo ves este dojo: el aislamiento lo aplican las politicas de la base de datos.'
            : `${dojos.length} dojos visibles.`}
        </Text>
      </Tarjeta>

      {!esSuperadmin && (
        <EnConstruccion
          fase="Proximas fases"
          detalle="Accesos directos a asistencia (Fase 3), verificacion de pagos (Fase 4) y examenes de grado (Fase 5)."
        />
      )}
    </Pantalla>
  );
}
