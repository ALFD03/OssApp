import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Almacen de sesion para Supabase Auth.
 *
 * En dispositivo usa expo-secure-store (Keychain / Keystore): el refresh token
 * no debe quedar en AsyncStorage en claro. SecureStore no existe en web, donde
 * se cae a localStorage.
 */
export const almacenamientoSeguro = {
  async getItem(clave: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      return globalThis.localStorage?.getItem(clave) ?? null;
    }
    return SecureStore.getItemAsync(clave);
  },
  async setItem(clave: string, valor: string): Promise<void> {
    if (Platform.OS === 'web') {
      globalThis.localStorage?.setItem(clave, valor);
      return;
    }
    await SecureStore.setItemAsync(clave, valor);
  },
  async removeItem(clave: string): Promise<void> {
    if (Platform.OS === 'web') {
      globalThis.localStorage?.removeItem(clave);
      return;
    }
    await SecureStore.deleteItemAsync(clave);
  },
};
