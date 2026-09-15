import { crearAlumno, useAuth, type DatosAlumno } from '@ossapp/data';
import { Boton, Campo, Pantalla, Tarjeta, tipografia, useEstilos, type Tema } from '@ossapp/ui';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

const crearEstilos = (tema: Tema) =>
  StyleSheet.create({
    error: { ...tipografia.cuerpo, color: tema.color.peligro },
    ayuda: { ...tipografia.pie, color: tema.color.textoSecundario },
  });

/** Formato ISO que espera Postgres para `date`. */
const FECHA_ISO = /^\d{4}-\d{2}-\d{2}$/;

export default function NuevoAlumno() {
  const { perfil } = useAuth();
  const estilos = useEstilos(crearEstilos);
  const router = useRouter();

  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [nacimiento, setNacimiento] = useState('');
  const [notas, setNotas] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function guardar() {
    setError(null);

    if (!nombre.trim() || !apellido.trim()) {
      setError('El nombre y el apellido son obligatorios.');
      return;
    }
    if (nacimiento && !FECHA_ISO.test(nacimiento.trim())) {
      setError('La fecha de nacimiento debe tener el formato AAAA-MM-DD.');
      return;
    }
    if (!perfil?.dojo_id) {
      setError('Tu cuenta no esta asociada a un dojo.');
      return;
    }

    const datos: DatosAlumno = {
      nombre: nombre.trim(),
      apellido: apellido.trim(),
      fecha_nacimiento: nacimiento.trim() || null,
      notas: notas.trim() || null,
    };

    setGuardando(true);
    try {
      await crearAlumno(perfil.dojo_id, datos);
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar el alumno.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Pantalla>
      <Tarjeta titulo="Datos del alumno">
        <Campo etiqueta="Nombre" value={nombre} onChangeText={setNombre} placeholder="Diego" />
        <Campo etiqueta="Apellido" value={apellido} onChangeText={setApellido} placeholder="Rojas" />
        <Campo
          etiqueta="Fecha de nacimiento"
          value={nacimiento}
          onChangeText={setNacimiento}
          placeholder="2015-03-21"
          autoCapitalize="none"
          keyboardType="numbers-and-punctuation"
        />
        <Campo
          etiqueta="Notas"
          value={notas}
          onChangeText={setNotas}
          placeholder="Alergias, lesiones, observaciones"
          multiline
        />
        <Text style={estilos.ayuda}>
          La asignacion a clase y el representante se configuran despues, desde la ficha.
        </Text>
      </Tarjeta>

      {!!error && <Text style={estilos.error}>{error}</Text>}

      <Boton titulo="Guardar alumno" onPress={guardar} cargando={guardando} />
      <Boton titulo="Cancelar" variante="texto" onPress={() => router.back()} />
    </Pantalla>
  );
}
