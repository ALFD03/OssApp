/**
 * Tipografia del sistema: Cascadia Code en todos los pesos.
 *
 * Los nombres de familia son los que registra `useFuentes()` y deben coincidir
 * exactamente con las claves pasadas a `useFonts`.
 */
export const FAMILIA = {
  regular: 'CascadiaCode_400Regular',
  media: 'CascadiaCode_500Medium',
  semiNegrita: 'CascadiaCode_600SemiBold',
  negrita: 'CascadiaCode_700Bold',
} as const;

/**
 * Cascadia Code es monoespaciada: con el mismo cuerpo ocupa mas ancho que una
 * tipografia de texto, asi que los tamanos van ligeramente por debajo de lo
 * habitual y el interlineado algo mas holgado.
 */
export const tipografia = {
  titulo: { fontFamily: FAMILIA.negrita, fontSize: 25, lineHeight: 32 },
  subtitulo: { fontFamily: FAMILIA.semiNegrita, fontSize: 18, lineHeight: 24 },
  seccion: { fontFamily: FAMILIA.semiNegrita, fontSize: 15, lineHeight: 21 },
  cuerpo: { fontFamily: FAMILIA.regular, fontSize: 14, lineHeight: 20 },
  pie: { fontFamily: FAMILIA.regular, fontSize: 12, lineHeight: 17 },
  etiqueta: { fontFamily: FAMILIA.semiNegrita, fontSize: 11, lineHeight: 15 },
} as const;
