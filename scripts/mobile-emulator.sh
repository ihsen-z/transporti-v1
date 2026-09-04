#!/usr/bin/env bash
# Test live de l'app mobile Transporti sur l'émulateur Android.
#
# Usage :
#   scripts/mobile-emulator.sh              # AVD par défaut, port 8081
#   scripts/mobile-emulator.sh Pixel_5_API_33 8083
#   scripts/mobile-emulator.sh --shot nom   # capture d'écran seule (émulateur déjà lancé)
#
# Enchaîne : boot de l'AVD → Metro (watch mode) → ouverture de l'application.
#
# PORT 8081 ET NON 8082. Ce script visait Expo Go, qui n'est PAS installé sur
# l'AVD `Pixel_7_API_35` : ce qui l'est, c'est un build de développement
# `tn.transporti.app` qui cherche son bundle sur `ws://10.0.2.2:8081` EN DUR.
# Avec Metro sur 8082, l'application reste sur un écran noir sans rien logger —
# une heure de diagnostic perdue en recette le 03/09.
set -euo pipefail

AVD="${1:-Pixel_7_API_35}"
PORT="${2:-8081}"

ANDROID_HOME="${ANDROID_HOME:-$LOCALAPPDATA/Android/Sdk}"
ADB="$ANDROID_HOME/platform-tools/adb.exe"
EMULATOR="$ANDROID_HOME/emulator/emulator.exe"
MOBILE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../mobile" && pwd)"
SHOT_DIR="$MOBILE_DIR/.expo/shots"   # .expo/ est gitignoré

# --- mode capture seule -------------------------------------------------------
if [ "${1:-}" = "--shot" ]; then
  mkdir -p "$SHOT_DIR"
  name="${2:-shot}"
  "$ADB" exec-out screencap -p > "$SHOT_DIR/$name.png"
  echo "capture : $SHOT_DIR/$name.png"
  exit 0
fi

# --- 1. émulateur -------------------------------------------------------------
if ! "$ADB" devices | grep -q 'emulator-.*device'; then
  echo "▶ démarrage de l'AVD $AVD…"
  # `cmd start` détache complètement : lancé avec un simple `&`, l'émulateur
  # reste un enfant du shell et meurt à l'arrêt de l'agent/terminal.
  (cd "$(dirname "$EMULATOR")" && \
    cmd //c start "" //B "$(basename "$EMULATOR")" \
      -avd "$AVD" -no-snapshot-save -no-boot-anim >/dev/null 2>&1)
else
  echo "✓ un émulateur est déjà connecté"
fi

echo "▶ attente du boot complet…"
for _ in $(seq 1 60); do
  [ "$("$ADB" shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" = "1" ] && break
  sleep 5
done
"$ADB" devices

# --- 2. Metro ----------------------------------------------------------------
# Pas de CI=1 : cela désactiverait le hot-reload, donc tout l'intérêt du test live.
if curl -s -m 2 "http://localhost:$PORT/status" 2>/dev/null | grep -q packager; then
  echo "✓ Metro déjà en écoute sur $PORT"
else
  echo "▶ démarrage de Metro sur le port $PORT…"
  # Détaché aussi (même raison que l'émulateur). Les logs vont dans un fichier,
  # pas /dev/null : en mode bridgeless les console.log de l'app n'apparaissent
  # PAS dans `adb logcat -s ReactNativeJS`, seulement ici.
  mkdir -p "$MOBILE_DIR/.expo"
  (cd "$MOBILE_DIR" && \
    cmd //c start "" //B cmd //c "npx expo start --port $PORT > .expo\\metro.log 2>&1")
  for _ in $(seq 1 40); do
    curl -s -m 2 "http://localhost:$PORT/status" 2>/dev/null | grep -q packager && break
    sleep 3
  done
fi

# --- 3. ouverture dans Expo Go -----------------------------------------------
# 10.0.2.2 = alias de l'hôte vu depuis l'AVD. Ne PAS utiliser 127.0.0.1 :
# même avec `adb reverse`, Expo Go échoue en "connection refused".
echo "▶ ouverture de l'app dans Expo Go…"
# Build de développement installé, et non Expo Go : voir l'en-tête.
"$ADB" shell am force-stop tn.transporti.app
sleep 2
"$ADB" shell am start -a android.intent.action.VIEW \
  -d "exp://10.0.2.2:$PORT" tn.transporti.app   || "$ADB" shell monkey -p tn.transporti.app -c android.intent.category.LAUNCHER 1

echo
echo "✓ prêt. Le bundle met ~10 s la première fois."
echo "  capture  : scripts/mobile-emulator.sh --shot mon-ecran"
echo "  logs JS  : tail -f mobile/.expo/metro.log"
