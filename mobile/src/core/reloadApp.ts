import { DevSettings } from 'react-native';

// Redémarre l'application pour appliquer un changement de sens RTL/LTR : le
// moteur de layout natif (Yoga) ne rebascule qu'au (re)démarrage du process,
// un simple re-render JS ne suffit pas.
//
// En dev (Expo Go / packager), DevSettings.reload() recharge l'app. En build de
// production, DevSettings est absent : on ne force pas de redémarrage ici (cela
// nécessiterait expo-updates, incompatible avec le flux Expo Go actuel). Ce
// n'est pas bloquant : le choix de langue est persisté (langStorage) et le sens
// RTL est posé à l'init (i18n) — le prochain lancement de l'app est donc
// entièrement dans le bon sens. À câbler sur un redémarrage natif complet quand
// le projet passera sur un dev/standalone build.
export function reloadApp(): void {
  if (typeof DevSettings?.reload === 'function') {
    DevSettings.reload();
  }
}
