import { iniciarSesion } from '@ossapp/data';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Boton } from '../Boton';
import { Campo } from '../Campo';
import { LogoOssApp } from '../LogoOssApp';
import { useEstilos } from '../TemaProvider';
import { espaciado, radios, type Tema } from '../temas';
import { tipografia } from '../tipografia';

type Props = {
  /** Que app es esta. Determina que roles se aceptan en el login. */
  app: 'staff' | 'familias';
  nombreApp: string;
  descripcion: string;
};

const crearEstilos = (tema: Tema) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: tema.color.fondo },
    flex: { flex: 1 },
    contenido: {
      padding: espaciado.xl,
      gap: espaciado.md,
      flexGrow: 1,
      justifyContent: 'center',
    },
    cabecera: { alignItems: 'center', gap: espaciado.xs, marginBottom: espaciado.xl },
    titulo: { ...tipografia.subtitulo, color: tema.color.texto },
    descripcion: {
      ...tipografia.cuerpo,
      color: tema.color.textoSecundario,
      textAlign: 'center',
    },
    alerta: {
      backgroundColor: tema.color.peligroSuave,
      borderRadius: radios.md,
      padding: espaciado.md,
      marginBottom: espaciado.sm,
    },
    alertaTexto: { ...tipografia.cuerpo, color: tema.color.peligro },
    pie: {
      ...tipografia.pie,
      color: tema.color.textoSecundario,
      textAlign: 'center',
      marginTop: espaciado.lg,
    },
  });

export function PantallaLogin({ app, nombreApp, descripcion }: Props) {
  const estilos = useEstilos(crearEstilos);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function entrar() {
    setError(null);

    if (!email.trim() || !password) {
      setError('Escribe tu correo y tu contrasena.');
      return;
    }

    setCargando(true);
    try {
      const resultado = await iniciarSesion(email, password, app);
      // Si sale bien no hay que navegar: el guard de (app) reacciona al cambio
      // de sesion del AuthProvider y redirige solo.
      if (!resultado.ok) setError(resultado.mensaje);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo conectar con el servidor.');
    } finally {
      setCargando(false);
    }
  }

  return (
    <SafeAreaView style={estilos.safe}>
      <KeyboardAvoidingView
        style={estilos.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={estilos.contenido} keyboardShouldPersistTaps="handled">
          <View style={estilos.cabecera}>
            {/* El logotipo ya incluye el nombre de marca, asi que aqui solo se
                anade que app es esta y para quien. */}
            <LogoOssApp ancho={260} />
            <Text style={estilos.titulo}>{nombreApp}</Text>
            <Text style={estilos.descripcion}>{descripcion}</Text>
          </View>

          <Campo
            etiqueta="Correo"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            placeholder="tu@correo.com"
            textContentType="emailAddress"
          />
          <Campo
            etiqueta="Contrasena"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            textContentType="password"
            placeholder="••••••••"
            onSubmitEditing={entrar}
            returnKeyType="go"
          />

          {!!error && (
            <View style={estilos.alerta} accessibilityLiveRegion="polite">
              <Text style={estilos.alertaTexto}>{error}</Text>
            </View>
          )}

          <Boton titulo="Entrar" onPress={entrar} cargando={cargando} />

          <Text style={estilos.pie}>Si no tienes cuenta, el maestro de tu dojo debe crearla.</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
