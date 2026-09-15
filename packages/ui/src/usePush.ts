import { registrarDispositivo } from '@ossapp/data';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: true,
  }),
});

/**
 * Registra el dispositivo para notificaciones push una vez hay sesion.
 *
 * Es deliberadamente silencioso: si el usuario deniega el permiso o el
 * dispositivo no soporta push (emulador, web), la app sigue funcionando y las
 * notificaciones se leen dentro de la pantalla de notificaciones.
 */
export function usePush(haySesion: boolean): void {
  useEffect(() => {
    if (!haySesion || !Device.isDevice) return;

    let vigente = true;

    void (async () => {
      try {
        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('default', {
            name: 'OssApp',
            importance: Notifications.AndroidImportance.DEFAULT,
          });
        }

        const actual = await Notifications.getPermissionsAsync();
        const concedido =
          actual.granted || (await Notifications.requestPermissionsAsync()).granted;
        if (!concedido || !vigente) return;

        const token = await Notifications.getExpoPushTokenAsync();
        if (!vigente) return;

        await registrarDispositivo(
          token.data,
          Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web',
        );
      } catch {
        // Sin push, la app sigue siendo usable. No se molesta al usuario.
      }
    })();

    return () => {
      vigente = false;
    };
  }, [haySesion]);
}
