/**
 * Paleta de marca de OssApp, extraida del logotipo (torii dorado sobre disco
 * carmesi, tinta sumi y fondo humo).
 *
 * Esto es la rampa CRUDA de marca: no se usa directamente en las pantallas.
 * Las pantallas consumen los tokens semanticos de `temas.ts`, que son los que
 * cambian entre tema claro y oscuro.
 */

export const paleta = {
  // Disco hinomaru del logo: carmesi profundo, no rojo primario.
  carmesi900: '#4A0A12',
  carmesi800: '#6E1220',
  carmesi700: '#8C1727',
  carmesi600: '#A81C2E',
  carmesi500: '#C1213A',
  carmesi400: '#D4475A',
  carmesi300: '#E88495',
  carmesi100: '#F7DDE1',
  carmesi050: '#FCF0F2',

  // Oro del torii. Es el acento, nunca el color de accion principal.
  oro900: '#5C4410',
  oro700: '#8A6D1F',
  oro600: '#A8852A',
  oro500: '#C9A227',
  oro400: '#DDBB53',
  oro300: '#E8D48B',
  oro100: '#F6EDD2',

  // Tinta sumi: negro calido, con matiz calido igual que el del logo.
  sumi950: '#100D0C',
  sumi900: '#16120F',
  sumi850: '#1E1916',
  sumi800: '#272120',
  sumi700: '#3A3230',
  sumi600: '#544A47',

  // Neutros hacia el blanco humo del fondo del logo.
  humo500: '#8A8380',
  humo400: '#A9A29F',
  humo300: '#C8C2BE',
  humo200: '#E2DDD9',
  humo100: '#EFEBE7',
  humo050: '#F7F4F1',
  blanco: '#FFFFFF',

  // Semanticos. Elegidos para convivir con el carmesi sin competir con el.
  exito600: '#1B7F4F',
  exito400: '#3FA872',
  exito100: '#DCF0E5',
  exito900: '#0F3D26',

  advertencia600: '#B76E00',
  advertencia400: '#DE9A2E',
  advertencia100: '#FAEBD3',
  advertencia900: '#4A2D00',

  peligro600: '#B3261E',
  peligro400: '#DB5A50',
  peligro100: '#FAE2E0',
  peligro900: '#4A0F0B',

  info600: '#1D6FA5',
  info400: '#4C9BCB',
  info100: '#DCEDF7',
  info900: '#0C2F47',
} as const;
