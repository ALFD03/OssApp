import { edadDe, puede, resumirHorarios, type AlumnoConDetalle, type ClaseConDetalle } from '@ossapp/core';
import {
  actualizarAlumno,
  asignarAClase,
  listarClases,
  obtenerAlumno,
  quitarDeClase,
  useAuth,
} from '@ossapp/data';
import {
  Boton,
  Campo,
  Cargando,
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
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

const crearEstilos = (tema: Tema) =>
  StyleSheet.create({
    error: { ...tipografia.cuerpo, color: tema.color.peligro },
    dato: { ...tipografia.cuerpo, color: tema.color.textoSecundario },
    lista: { padding: 0, overflow: 'hidden' },
  });

export default function FichaAlumno() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { perfil } = useAuth();
  const estilos = useEstilos(crearEstilos);
  const router = useRouter();

  const [ficha, setFicha] = useState<AlumnoConDetalle | null>(null);
  const [clases, setClases] = useState<ClaseConDetalle[]>([]);
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [notas, setNotas] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    if (!id) return;
    try {
      const [datos, catalogo] = await Promise.all([
        obtenerAlumno(id),
        listarClases({ soloActivas: true }),
      ]);
      setFicha(datos);
      setClases(catalogo);
      if (datos) {
        setNombre(datos.nombre);
        setApellido(datos.apellido);
        setNotas(datos.notas ?? '');
      }
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar la ficha.');
    } finally {
      setCargando(false);
    }
  }, [id]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  if (cargando) return <Cargando />;
  if (!ficha || !perfil) {
    return (
      <Pantalla>
        <EstadoVacio
          icono="alert-circle-outline"
          titulo="Alumno no encontrado"
          detalle="Puede que haya sido dado de baja o que no pertenezca a tu dojo."
        />
      </Pantalla>
    );
  }

  // Alias no nulo: TypeScript pierde el estrechamiento de `ficha` dentro de los
  // callbacks, y este const si lo conserva.
  const alumno = ficha;
  const puedeGestionar = puede(perfil.rol, 'alumnos.gestionar');
  const edad = edadDe(alumno.fecha_nacimiento);
  const inscritoEn = new Set(alumno.clases.map((c) => c.id));

  async function guardar() {
    if (!nombre.trim() || !apellido.trim()) {
      setError('El nombre y el apellido son obligatorios.');
      return;
    }
    setGuardando(true);
    try {
      await actualizarAlumno(alumno.id, {
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        notas: notas.trim() || null,
      });
      await cargar();
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar.');
    } finally {
      setGuardando(false);
    }
  }

  async function alternarClase(claseId: string) {
    if (!perfil?.dojo_id) return;
    try {
      if (inscritoEn.has(claseId)) await quitarDeClase(claseId, alumno.id);
      else await asignarAClase(perfil.dojo_id, claseId, alumno.id);
      await cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cambiar la clase.');
    }
  }

  function confirmarBaja() {
    Alert.alert(
      alumno.activo ? 'Dar de baja' : 'Reactivar alumno',
      alumno.activo
        ? 'El alumno deja de aparecer como activo, pero se conserva su historial.'
        : 'El alumno vuelve a contar como activo en el dojo.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: alumno.activo ? 'Dar de baja' : 'Reactivar',
          style: alumno.activo ? 'destructive' : 'default',
          onPress: () => {
            void actualizarAlumno(alumno.id, { activo: !alumno.activo }).then(cargar);
          },
        },
      ],
    );
  }

  return (
    <Pantalla>
      <Tarjeta titulo={`${alumno.nombre} ${alumno.apellido}`}>
        <Text style={estilos.dato}>
          {[
            edad !== null ? `${edad} anos` : null,
            `Ingreso: ${alumno.fecha_ingreso}`,
          ]
            .filter(Boolean)
            .join(' · ')}
        </Text>
        {!alumno.activo && <Insignia texto="Inactivo" tono="advertencia" />}
      </Tarjeta>

      {puedeGestionar ? (
        <Tarjeta titulo="Editar datos">
          <Campo etiqueta="Nombre" value={nombre} onChangeText={setNombre} />
          <Campo etiqueta="Apellido" value={apellido} onChangeText={setApellido} />
          <Campo etiqueta="Notas" value={notas} onChangeText={setNotas} multiline />
          <Boton titulo="Guardar cambios" onPress={guardar} cargando={guardando} />
        </Tarjeta>
      ) : (
        !!alumno.notas && <Tarjeta titulo="Notas">
          <Text style={estilos.dato}>{alumno.notas}</Text>
        </Tarjeta>
      )}

      <Tarjeta titulo="Clases">
        {puedeGestionar ? (
          <Selector
            opciones={clases.map((clase) => ({ valor: clase.id, etiqueta: clase.nombre }))}
            // Es multiseleccion: `valor` se deja en null y el estado lo marca
            // cada pulsacion, que alterna la inscripcion.
            valor={null}
            onCambiar={alternarClase}
          />
        ) : null}
        {alumno.clases.length === 0 ? (
          <Text style={estilos.dato}>Sin clase asignada.</Text>
        ) : (
          alumno.clases.map((clase) => {
            const detalle = clases.find((c) => c.id === clase.id);
            return (
              <View key={clase.id}>
                <Fila
                  titulo={clase.nombre}
                  detalle={detalle ? resumirHorarios(detalle.horarios) : undefined}
                  onPress={puedeGestionar ? () => alternarClase(clase.id) : undefined}
                />
              </View>
            );
          })
        )}
      </Tarjeta>

      <Tarjeta titulo="Representantes" style={estilos.lista}>
        {alumno.representantes.length === 0 ? (
          <EstadoVacio
            icono="person-outline"
            titulo="Sin representante"
            detalle="Asigna un representante para que la familia vea asistencia y pagos."
          />
        ) : (
          alumno.representantes.map((representante, indice) => (
            <View key={representante.id}>
              {indice > 0 && <Separador />}
              <Fila
                titulo={`${representante.nombre} ${representante.apellido}`}
                detalle={representante.parentesco ?? 'Representante'}
              />
            </View>
          ))
        )}
      </Tarjeta>

      {!!error && <Text style={estilos.error}>{error}</Text>}

      {puedeGestionar && (
        <Boton
          titulo={alumno.activo ? 'Dar de baja' : 'Reactivar alumno'}
          variante="secundario"
          onPress={confirmarBaja}
        />
      )}
      <Boton titulo="Volver" variante="texto" onPress={() => router.back()} />
    </Pantalla>
  );
}
