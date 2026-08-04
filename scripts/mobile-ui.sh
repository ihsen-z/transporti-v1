#!/usr/bin/env bash
# Pilotage de l'UI de l'émulateur par l'ARBRE D'ACCESSIBILITÉ (pas de
# coordonnées devinées). Équivalent local des outils mobile-mcp
# mobile_list_elements_on_screen / mobile_click_on_screen_at_coordinates.
#
# Usage :
#   scripts/mobile-ui.sh elements                # liste les éléments + centres
#   scripts/mobile-ui.sh tap "Se connecter"      # tape l'élément par son label
#   scripts/mobile-ui.sh type "a@b.tn"           # saisit du texte
#   scripts/mobile-ui.sh shot mon-ecran          # capture -> mobile/.expo/shots/
#   scripts/mobile-ui.sh open                    # ouvre l'app via le deep link
set -euo pipefail

ANDROID_HOME="${ANDROID_HOME:-$LOCALAPPDATA/Android/Sdk}"
ADB="$ANDROID_HOME/platform-tools/adb.exe"
MOBILE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../mobile" && pwd)"
PORT="${PORT:-8082}"
UI_XML="$MOBILE_DIR/.expo/ui.xml"

# ATTENTION : git-bash réécrit tout argument commençant par «/» en chemin
# Windows — «/sdcard/ui.xml» devient «C:/Program Files (x86)/…» et le shell du
# device échoue sur les parenthèses. D'où le dump vers stdout via exec-out.
dump_tree() {
  mkdir -p "$MOBILE_DIR/.expo"
  "$ADB" exec-out uiautomator dump /dev/tty 2>/dev/null \
    | sed 's/UI hierchary dumped to: .*//' > "$UI_XML"
}

# Parse l'arbre. Sans argument : liste tout. Avec un label : renvoie « x y ».
parse_tree() {
  python -c "
import re, sys, xml.etree.ElementTree as ET
want = sys.argv[2] if len(sys.argv) > 2 else None
for e in ET.parse(sys.argv[1]).iter('node'):
    label = (e.get('text','') or e.get('content-desc','')).strip()
    if not label:
        continue
    b = re.findall(r'\d+', e.get('bounds',''))
    cx, cy = (int(b[0])+int(b[2]))//2, (int(b[1])+int(b[3]))//2
    if want is None:
        print(f'  \"{label}\"  clickable={e.get(\"clickable\")}  centre=({cx},{cy})')
    elif want.lower() in label.lower():
        # Un label peut apparaître deux fois (conteneur cliquable + texte) :
        # on privilégie le noeud réellement cliquable.
        print(cx, cy, e.get('clickable'))
" "$UI_XML" ${1+"$1"}
}

case "${1:-elements}" in
  elements)
    dump_tree; parse_tree
    ;;
  tap)
    label="${2:?label attendu}"
    dump_tree
    coords="$(parse_tree "$label" | awk '$3=="true"{print $1, $2; found=1; exit} END{if(!found) exit 1}' \
              || parse_tree "$label" | head -1 | awk '{print $1, $2}')"
    [ -n "$coords" ] || { echo "élément introuvable : $label" >&2; exit 1; }
    echo "tap \"$label\" -> $coords"
    "$ADB" shell input tap $coords
    ;;
  type)
    "$ADB" shell input text "${2:?texte attendu}"
    ;;
  shot)
    mkdir -p "$MOBILE_DIR/.expo/shots"
    "$ADB" exec-out screencap -p > "$MOBILE_DIR/.expo/shots/${2:-shot}.png"
    echo "capture : mobile/.expo/shots/${2:-shot}.png"
    ;;
  open)
    "$ADB" shell am start -a android.intent.action.VIEW \
      -d "exp://10.0.2.2:$PORT" host.exp.exponent
    ;;
  *)
    echo "commande inconnue : $1" >&2; exit 1
    ;;
esac
