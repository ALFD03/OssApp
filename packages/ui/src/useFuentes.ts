import {
  CascadiaCode_400Regular,
  CascadiaCode_500Medium,
  CascadiaCode_600SemiBold,
  CascadiaCode_700Bold,
} from '@expo-google-fonts/cascadia-code';
import { useFonts } from 'expo-font';

/**
 * Carga Cascadia Code. Las claves son las familias que usa `tipografia.ts`.
 *
 * Hasta que resuelve, la app no debe pintar texto: si lo hace, se ve un salto
 * de la fuente del sistema a Cascadia. El layout raiz espera a que devuelva true.
 */
export function useFuentes(): boolean {
  const [cargadas, error] = useFonts({
    CascadiaCode_400Regular,
    CascadiaCode_500Medium,
    CascadiaCode_600SemiBold,
    CascadiaCode_700Bold,
  });

  // Si la fuente falla, es mejor arrancar con la del sistema que dejar la app
  // bloqueada en la pantalla de carga.
  return cargadas || !!error;
}
