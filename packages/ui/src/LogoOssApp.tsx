import React from 'react';
import { Image, StyleSheet, type StyleProp, type ImageStyle } from 'react-native';

/**
 * Logotipo oficial de OssApp.
 *
 * Se usa el archivo de marca tal cual (assets/logo.png): no se reconstruye ni
 * se reinterpreta. Cualquier cambio de marca se hace sustituyendo ese archivo.
 */
export function LogoOssApp({
  ancho = 240,
  style,
}: {
  ancho?: number;
  style?: StyleProp<ImageStyle>;
}) {
  // Proporcion del archivo original (1024 x 559).
  const alto = Math.round((ancho * 559) / 1024);

  return (
    <Image
      source={require('../../../assets/logo.png')}
      style={[estilos.logo, { width: ancho, height: alto }, style]}
      resizeMode="contain"
      accessibilityLabel="OssApp - Gestion de dojos"
    />
  );
}

const estilos = StyleSheet.create({
  logo: { alignSelf: 'center' },
});
