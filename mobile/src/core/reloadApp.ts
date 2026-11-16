import { Alert, DevSettings } from 'react-native';
import i18n from '@/core/i18n';

// Redémarre l'application pour appliquer un changement de sens RTL/LTR : le
// moteur de layout natif (Yoga) ne rebascule qu'au (re)démarrage du process,
// un simple re-render JS ne suffit pas.
//
// En développement (Expo Go / packager), DevSettings.reload() recharge l'app.
// Dans un build de release, `DevSettings.reload` EXISTE mais ne fait rien (React
// Native y met une coquille vide) : tester `typeof === 'function'` laissait le
// texte passer en arabe avec une mise en page restée de gauche à droite, sans
// aucun message. On teste donc `__DEV__`, et hors développement on demande à
// l'utilisateur de fermer puis rouvrir l'application. Le choix de langue est
// persisté (langStorage) et le sens est posé à l'init (i18n) : la réouverture
// suffit. Un redémarrage automatique demanderait expo-updates.
//
// `lang` : la langue CHOISIE, pour rédiger l'alerte dans celle que la personne
// vient de demander (le changement de langue i18n peut ne pas être appliqué
// au moment de l'appel).
export function reloadApp(lang?: 'fr' | 'ar'): void {
  if (__DEV__ && typeof DevSettings?.reload === 'function') {
    DevSettings.reload();
    return;
  }
  const options = lang ? { lng: lang } : {};
  Alert.alert(i18n.t('lang.restart_title', options), i18n.t('lang.restart_body', options));
}
