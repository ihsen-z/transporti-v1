#!/usr/bin/env bash
# Prépare TOUT pour tester Transporti sur un vrai téléphone (Android ou iPhone).
#
#   scripts/mobile-telephone.sh
#
# Le script : détecte l'IP du PC, met à jour mobile/.env, vérifie le pare-feu,
# puis ouvre deux fenêtres (backend + Metro avec le QR code à scanner).
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PORT_METRO=8082
PORT_API=8000

echo "──────────────────────────────────────────────"
echo " Test de Transporti sur téléphone réel"
echo "──────────────────────────────────────────────"

# --- 1. Adresse du PC sur le réseau local -----------------------------------
# On demande à l'OS quelle interface sert à sortir : c'est la bonne, et cela
# évite de tomber sur les cartes virtuelles (WSL, Hyper-V) qui ne sont PAS
# joignables depuis le téléphone.
IP="$(python -c "
import socket
s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
s.connect(('8.8.8.8', 80))
print(s.getsockname()[0])
s.close()")"

WIFI="$(netsh wlan show interfaces 2>/dev/null | tr -d '\r' | sed -n 's/^ *SSID *: *//p' | head -1)"

echo "  PC        : $IP"
echo "  Wi-Fi     : ${WIFI:-<connexion filaire>}"
echo ""

# --- 2. Mise à jour de mobile/.env ------------------------------------------
ENV_FILE="$ROOT/mobile/.env"
if grep -q "EXPO_PUBLIC_API_BASE_URL=http://$IP:$PORT_API" "$ENV_FILE" 2>/dev/null; then
  echo "  ✓ mobile/.env est déjà à la bonne adresse"
else
  echo "  → mise à jour de mobile/.env avec $IP"
  sed -i "s|^EXPO_PUBLIC_API_BASE_URL=.*|EXPO_PUBLIC_API_BASE_URL=http://$IP:$PORT_API|" "$ENV_FILE"
fi

# --- 3. Pare-feu -------------------------------------------------------------
# On NE crée PAS les règles ici : cela demande les droits administrateur.
rules_ok=1
for p in "$PORT_METRO" "$PORT_API"; do
  netsh advfirewall firewall show rule name="Transporti dev $p" >/dev/null 2>&1 || rules_ok=0
done

if [ "$rules_ok" = "0" ]; then
  echo ""
  echo "  ⚠ PARE-FEU : les ports ne sont pas encore ouverts."
  echo ""
  echo "  Ouvre PowerShell EN ADMINISTRATEUR (clic droit > Exécuter en tant"
  echo "  qu'administrateur) et colle ces deux lignes :"
  echo ""
  echo "    netsh advfirewall firewall add rule name=\"Transporti dev $PORT_API\" dir=in action=allow protocol=TCP localport=$PORT_API"
  echo "    netsh advfirewall firewall add rule name=\"Transporti dev $PORT_METRO\" dir=in action=allow protocol=TCP localport=$PORT_METRO"
  echo ""
  echo "  Puis relance ce script."
  echo ""
  exit 1
fi
echo "  ✓ pare-feu : ports $PORT_API et $PORT_METRO ouverts"

# --- 4. Démarrage des deux serveurs -----------------------------------------
# Fenêtres VISIBLES (pas en arrière-plan) : le QR code doit être lisible, et un
# débutant doit pouvoir voir les erreurs éventuelles.
echo ""
echo "  → ouverture du backend (fenêtre « Backend Transporti »)…"
cmd //c start "Backend Transporti" cmd //k \
  "cd /d $(cygpath -w "$ROOT/backend") && set PYTHONIOENCODING=utf-8&& set PYTHONUTF8=1&& set ALLOWED_HOSTS=localhost,127.0.0.1,10.0.2.2,$IP&& venv\\Scripts\\python.exe manage.py runserver 0.0.0.0:$PORT_API"

echo "  → ouverture de Metro (fenêtre « Metro Transporti », QR code dedans)…"
cmd //c start "Metro Transporti" cmd //k \
  "cd /d $(cygpath -w "$ROOT/mobile") && npx expo start --port $PORT_METRO"

cat <<EOF

──────────────────────────────────────────────
 SUR TON TÉLÉPHONE
──────────────────────────────────────────────

 1. Connecte-le au même Wi-Fi que le PC : ${WIFI:-<le réseau du PC>}
 2. Installe « Expo Go » (Play Store ou App Store)
 3. Scanne le QR code de la fenêtre « Metro Transporti »
      Android : depuis Expo Go > Scan QR code
      iPhone  : avec l'appareil photo, puis touche la notification

 Si le QR ne marche pas, ouvre Expo Go > « Enter URL manually » et tape :

      exp://$IP:$PORT_METRO

 Comptes de test (mot de passe : Test@123!)
      transporteur  mehdi.khelifi@test.transporti.tn
      client        leila.benamor@test.transporti.tn

EOF
