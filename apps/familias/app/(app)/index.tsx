import {
  ETIQUETA_ESTADO_LICENCIA,
  ETIQUETA_ROL,
  licenciaPermiteOperar,
  nombreCompleto,
  puede,
  type EstadoLicencia,
} from '@ossapp/core';
import { useAuth } from '@ossapp/data';
import {
  EnConstruccion,
  Insignia,
  Pantalla,
  Tarjeta,
  espaciado,
  tipografia,
  useEstilos,
  type Tema,
  type TonoInsignia,
} from '@ossapp/ui';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

const TONO_LICENCIA: Record<EstadoLicencia, TonoInsignia> = {
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
      gap: espaciado.lg,
    },
    etiqueta: { ...tipografia.cuerpo, color: tema.color.textoSecundario },
    dato: { ...tipografia.cuerpo, color: tema.color.texto, flexShrink: 1, textAlign: 'right' },
    aviso: { ...tipografia.pie, color: tema.color.advertencia },
    pie: { ...tipografia.pie, color: tema.color.textoTenue, marginTop: espaciado.xs },
  });

export default function Inicio() {
  const { perfil } = useAuth();
  const estilos = useEstilos(crearEstilos);

  if (!perfil) return null;

  const esRepresentante = perfil.rol === 'representante';

  return (
    <Pantalla>
      <View>
        <Text style={estilos.saludo}>Oss, {perfil.nombre}</Text>
        <Text style={estilos.subtitulo}>
          {ETIQUETA_ROL[perfil.rol]}
          {perfil.dojo ? ` · ${perfil.dojo.nombre}` : ''}
        </Text>
      </View>

      {perfil.dojo && (
        <Tarjeta titulo="Tu dojo">
          <View style={estilos.fila}>
            <Text style={estilos.dato}>{perfil.dojo.nombre}</Text>
            <Insignia
              texto={ETIQUETA_ESTADO_LICENCIA[perfil.dojo.estado_licencia]}
              tono={TONO_LICENCIA[perfil.dojo.estado_licencia]}
            />
          </View>
          {!licenciaPermiteOperar(perfil.dojo.estado_licencia) && (
            <Text style={estilos.aviso}>
              El dojo tiene la licencia inactiva. Algunas funciones podrian no estar disponibles.
            </Text>
          )}
          <Text style={estilos.pie}>
            Solo ves la informacion de tu dojo: el aislamiento lo aplican las politicas de la base
            de datos.
          </Text>
        </Tarjeta>
      )}

      <Tarjeta titulo="Tu cuenta">
        <View style={estilos.fila}>
          <Text style={estilos.etiqueta}>Nombre</Text>
          <Text style={estilos.dato}>{nombreCompleto(perfil)}</Text>
        </View>
        <View style={estilos.fila}>
          <Text style={estilos.etiqueta}>Correo</Text>
          <Text style={estilos.dato}>{perfil.email}</Text>
        </View>
      </Tarjeta>

      <EnConstruccion
        fase="Fase 3"
        detalle="Aqui estara el boton para escanear el QR del dojo y registrar la asistencia."
      />

      {puede(perfil.rol, 'pagos.comprobante.subir') && (
        <EnConstruccion
          fase="Fase 4"
          detalle="Aqui podras subir el comprobante de pago y seguir el estado de solvencia."
        />
      )}

      <EnConstruccion
        fase="Fase 5"
        detalle={
          esRepresentante
            ? 'Aqui veras el progreso de cinturon de cada uno de tus alumnos.'
            : 'Aqui veras tu progreso hacia el siguiente cinturon y tu historial de examenes.'
        }
      />
    </Pantalla>
  );
}
