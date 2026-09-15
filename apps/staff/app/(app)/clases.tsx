import {
  ETIQUETA_NIVEL,
  NIVELES_CLASE,
  puede,
  resumirHorarios,
  type ClaseConDetalle,
  type NivelClase,
} from '@ossapp/core';
import { crearClase, listarClases, listarUsuarios, useAuth } from '@ossapp/data';
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
  tipografia,
  useEstilos,
  type Tema,
} from '@ossapp/ui';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

const crearEstilos = (tema: Tema) =>
  StyleSheet.create({
    lista: { padding: 0, overflow: 'hidden' },
    error: { ...tipografia.cuerpo, color: tema.color.peligro },
  });

type Sensei = { id: string; nombre: string; apellido: string };

export default function Clases() {
  const { perfil } = useAuth();
  const estilos = useEstilos(crearEstilos);
  const router = useRouter();

  const [clases, setClases] = useState<ClaseConDetalle[]>([]);
  const [senseis, setSenseis] = useState<Sensei[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refrescando, setRefrescando] = useState(false);

  const [formulario, setFormulario] = useState(false);
  const [nombre, setNombre] = useState('');
  const [nivel, setNivel] = useState<NivelClase>('mixto');
  const [senseiId, setSenseiId] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  // El sensei solo ve las clases que imparte; el maestro, todas las del dojo.
  const soloPropias = perfil?.rol === 'sensei';

  const cargar = useCallback(async () => {
    if (!perfil) return;
    setRefrescando(true);
    try {
      const [catalogo, personal] = await Promise.all([
        listarClases(soloPropias ? { senseiId: perfil.id } : {}),
        puede(perfil.rol, 'clases.gestionar') ? listarUsuarios('sensei') : Promise.resolve([]),
      ]);
      setClases(catalogo);
      setSenseis(personal.map((u) => ({ id: u.id, nombre: u.nombre, apellido: u.apellido })));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar las clases.');
    } finally {
      setRefrescando(false);
    }
  }, [perfil, soloPropias]);

  useFocusEffect(
    useCallback(() => {
      void cargar();
    }, [cargar]),
  );

  if (!perfil) return null;
  const puedeGestionar = puede(perfil.rol, 'clases.gestionar');

  async function guardar() {
    if (!nombre.trim()) {
      setError('La clase necesita un nombre.');
      return;
    }
    if (!perfil?.dojo_id) return;

    setGuardando(true);
    try {
      await crearClase(perfil.dojo_id, {
        nombre: nombre.trim(),
        nivel,
        sensei_id: senseiId,
      });
      setNombre('');
      setNivel('mixto');
      setSenseiId(null);
      setFormulario(false);
      await cargar();
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo crear la clase.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <>
      <Pantalla
        titulo={soloPropias ? 'Mis clases' : 'Clases'}
        onRefrescar={cargar}
        refrescando={refrescando}
      >
        {!!error && <Text style={estilos.error}>{error}</Text>}

        {formulario && puedeGestionar && (
          <Tarjeta titulo="Nueva clase">
            <Campo
              etiqueta="Nombre"
              value={nombre}
              onChangeText={setNombre}
              placeholder="Karate infantil"
            />
            <Selector
              etiqueta="Nivel"
              opciones={NIVELES_CLASE.map((valor) => ({ valor, etiqueta: ETIQUETA_NIVEL[valor] }))}
              valor={nivel}
              onCambiar={setNivel}
            />
            {senseis.length > 0 && (
              <Selector
                etiqueta="Sensei responsable"
                opciones={senseis.map((s) => ({
                  valor: s.id,
                  etiqueta: `${s.nombre} ${s.apellido}`,
                }))}
                valor={senseiId}
                onCambiar={setSenseiId}
                desplazable
              />
            )}
            <Boton titulo="Crear clase" onPress={guardar} cargando={guardando} />
            <Boton titulo="Cancelar" variante="texto" onPress={() => setFormulario(false)} />
          </Tarjeta>
        )}

        {clases.length === 0 ? (
          <EstadoVacio
            icono="calendar-outline"
            titulo="Todavia no hay clases"
            detalle={
              puedeGestionar
                ? 'Crea la primera clase y despues asignale horarios.'
                : soloPropias
                  ? 'El maestro aun no te ha asignado ninguna clase.'
                  : 'El maestro del dojo aun no ha creado clases.'
            }
          />
        ) : (
          <Tarjeta style={estilos.lista}>
            {clases.map((clase, indice) => (
              <View key={clase.id}>
                {indice > 0 && <Separador />}
                <Fila
                  titulo={clase.nombre}
                  detalle={`${ETIQUETA_NIVEL[clase.nivel]} · ${resumirHorarios(clase.horarios)}`}
                  derecha={
                    <Insignia
                      texto={`${clase.inscritos}${clase.capacidad ? `/${clase.capacidad}` : ''}`}
                      tono={
                        clase.capacidad && clase.inscritos >= clase.capacidad ? 'advertencia' : 'acento'
                      }
                    />
                  }
                  onPress={() => router.push(`/clase/${clase.id}`)}
                />
              </View>
            ))}
          </Tarjeta>
        )}
      </Pantalla>

      {puedeGestionar && !formulario && (
        <BotonFlotante titulo="Nueva clase" onPress={() => setFormulario(true)} />
      )}
    </>
  );
}
