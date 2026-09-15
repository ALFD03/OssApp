import { paleta } from './paleta';

/**
 * Tokens semanticos. Las pantallas SOLO usan estos: nunca un color literal ni
 * un valor de `paleta` directamente. Asi el tema oscuro sale gratis.
 */
export type Tema = {
  nombre: 'claro' | 'oscuro';
  /** `light`/`dark` para StatusBar, teclados y controles nativos. */
  esquema: 'light' | 'dark';
  color: {
    // Superficies, de atras hacia adelante
    fondo: string;
    superficie: string;
    superficieAlterna: string;
    superficieMarca: string;
    borde: string;
    bordeSuave: string;

    // Texto
    texto: string;
    textoSecundario: string;
    textoTenue: string;
    /** Texto sobre `primario` o sobre `superficieMarca`. */
    textoSobreMarca: string;

    // Marca
    primario: string;
    primarioPresionado: string;
    primarioSuave: string;
    acento: string;
    acentoSuave: string;

    // Estados
    exito: string;
    exitoSuave: string;
    advertencia: string;
    advertenciaSuave: string;
    peligro: string;
    peligroSuave: string;
    info: string;
    infoSuave: string;
  };
  sombra: {
    tarjeta: {
      shadowColor: string;
      shadowOpacity: number;
      shadowRadius: number;
      shadowOffset: { width: number; height: number };
      elevation: number;
    };
  };
};

export const temaClaro: Tema = {
  nombre: 'claro',
  esquema: 'light',
  color: {
    fondo: paleta.humo050,
    superficie: paleta.blanco,
    superficieAlterna: paleta.humo100,
    // Las cabeceras van en sumi, como el torii del logo sobre el fondo claro.
    superficieMarca: paleta.sumi900,
    borde: paleta.humo300,
    bordeSuave: paleta.humo200,

    texto: paleta.sumi900,
    textoSecundario: paleta.sumi600,
    textoTenue: paleta.humo500,
    textoSobreMarca: paleta.humo050,

    primario: paleta.carmesi600,
    primarioPresionado: paleta.carmesi700,
    primarioSuave: paleta.carmesi050,
    acento: paleta.oro700,
    acentoSuave: paleta.oro100,

    exito: paleta.exito600,
    exitoSuave: paleta.exito100,
    advertencia: paleta.advertencia600,
    advertenciaSuave: paleta.advertencia100,
    peligro: paleta.peligro600,
    peligroSuave: paleta.peligro100,
    info: paleta.info600,
    infoSuave: paleta.info100,
  },
  sombra: {
    tarjeta: {
      shadowColor: paleta.sumi950,
      shadowOpacity: 0.08,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 2,
    },
  },
};

export const temaOscuro: Tema = {
  nombre: 'oscuro',
  esquema: 'dark',
  color: {
    fondo: paleta.sumi950,
    superficie: paleta.sumi850,
    superficieAlterna: paleta.sumi800,
    superficieMarca: paleta.sumi850,
    borde: paleta.sumi700,
    bordeSuave: paleta.sumi800,

    texto: paleta.humo050,
    textoSecundario: paleta.humo400,
    textoTenue: paleta.humo500,
    textoSobreMarca: paleta.humo050,

    // Sobre fondo oscuro el carmesi 600 no llega a contraste legible:
    // se sube a 400, que si pasa AA sobre sumi.
    primario: paleta.carmesi400,
    primarioPresionado: paleta.carmesi300,
    primarioSuave: paleta.carmesi900,
    acento: paleta.oro400,
    acentoSuave: paleta.oro900,

    exito: paleta.exito400,
    exitoSuave: paleta.exito900,
    advertencia: paleta.advertencia400,
    advertenciaSuave: paleta.advertencia900,
    peligro: paleta.peligro400,
    peligroSuave: paleta.peligro900,
    info: paleta.info400,
    infoSuave: paleta.info900,
  },
  sombra: {
    tarjeta: {
      shadowColor: '#000000',
      shadowOpacity: 0.4,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 6 },
      elevation: 4,
    },
  },
};

/** Escala de 4px. No depende del tema. */
export const espaciado = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radios = {
  sm: 6,
  md: 10,
  lg: 16,
  pill: 999,
} as const;
