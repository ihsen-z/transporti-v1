import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';
import { I18nManager } from 'react-native';
import fr from './locales/fr.json';
import ar from './locales/ar.json';
import { getStoredLang } from './langStorage';

// Langue initiale = choix persisté s'il existe, sinon langue de l'appareil
// (fr/ar supportées), sinon FR.
const deviceLang = getLocales()[0]?.languageCode ?? 'fr';
const initialLang = getStoredLang() ?? (deviceLang === 'ar' ? 'ar' : 'fr');

// RTL (derja AR). On autorise le RTL puis on pose le sens correspondant à la
// langue initiale AVANT le premier rendu. Le moteur de layout natif (Yoga) lit
// ce drapeau au démarrage du process : combiné à la persistance de la langue
// (langStorage), un lancement à froid en arabe est ainsi entièrement miroité.
// Le changement de langue EN COURS de session déclenche un reload (voir
// LanguageToggle) pour que le natif rebascule le sens.
I18nManager.allowRTL(true);
I18nManager.forceRTL(initialLang === 'ar');

void i18n.use(initReactI18next).init({
  resources: {
    fr: { translation: fr },
    ar: { translation: ar },
  },
  lng: initialLang,
  fallbackLng: 'fr',
  // Format de pluriels v3 (moteur intégré i18next, sans dépendance à
  // Intl.PluralRules) : Hermes n'embarque pas PluralRules -> le format v4 par
  // défaut émettrait un avertissement au boot. Clés : `_plural` (FR),
  // `_0`.. `_5` (AR, 6 catégories).
  compatibilityJSON: 'v3',
  interpolation: { escapeValue: false },
});

export default i18n;
