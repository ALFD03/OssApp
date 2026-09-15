#!/usr/bin/env bash
#
# Arranca una app en un telefono Android conectado por USB.
#
#   ./scripts/telefono.sh staff
#   ./scripts/telefono.sh familias
#
# Pensado para redes donde el telefono NO alcanza al PC (WiFi de invitados,
# redes de trabajo aisladas entre si). En lugar de usar la IP de la maquina,
# `adb reverse` hace que el telefono reenvie sus propios puertos locales al PC
# por el cable USB: para la app, Metro y Supabase estan en su propio localhost.
#
set -euo pipefail

APP="${1:-}"
if [[ "$APP" != "staff" && "$APP" != "familias" ]]; then
  echo "Uso: $0 [staff|familias]" >&2
  exit 1
fi

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PUERTO_METRO=8081
PUERTO_SUPABASE=54321

if ! command -v adb >/dev/null 2>&1; then
  echo "Falta adb. Instalalo con:  sudo pacman -S android-tools android-udev" >&2
  exit 1
fi

echo "==> Buscando el telefono..."
adb start-server >/dev/null 2>&1 || true

if ! adb devices | awk 'NR>1 && $2=="device" {found=1} END {exit !found}'; then
  echo "No hay ningun telefono autorizado. Revisa que:" >&2
  echo "  1. Este conectado por USB." >&2
  echo "  2. Tenga activada la depuracion por USB (Opciones de desarrollador)." >&2
  echo "  3. Hayas aceptado el dialogo 'Permitir depuracion USB' en la pantalla." >&2
  echo >&2
  adb devices >&2
  exit 1
fi

adb devices | awk 'NR>1 && $2=="device" {print "    dispositivo: " $1}'

# El telefono redirige SU localhost:puerto hacia el PC. Hay que rehacerlo cada
# vez que se desconecta el cable o se reinicia adb.
echo "==> Reenviando puertos por USB"
adb reverse "tcp:${PUERTO_METRO}" "tcp:${PUERTO_METRO}"
adb reverse "tcp:${PUERTO_SUPABASE}" "tcp:${PUERTO_SUPABASE}"
echo "    localhost:${PUERTO_METRO} (Metro) y localhost:${PUERTO_SUPABASE} (Supabase) -> este PC"

if ! curl -s -o /dev/null "http://127.0.0.1:${PUERTO_SUPABASE}/rest/v1/" ; then
  echo
  echo "AVISO: Supabase no responde en el puerto ${PUERTO_SUPABASE}." >&2
  echo "Levantalo en otra terminal con:  npm run db:start" >&2
  echo
fi

echo "==> Arrancando ${APP}. Abre Expo Go en el telefono cuando aparezca el QR."
cd "$RAIZ/apps/$APP"

# --localhost obliga a Expo a anunciar la app en 127.0.0.1, que gracias al
# reverse es justo lo que el telefono sabe alcanzar.
exec npx expo start --localhost --clear
