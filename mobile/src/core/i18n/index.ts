import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';
import { I18nManager } from 'react-native';
import fr from './locales/fr.json';
import ar from './locales/ar.json';

// Langue par défaut = langue de l'appareil si supportée (fr/ar), sinon FR.
const deviceLang = getLocales()[0]?.languageCode ?? 'fr';
const initialLang = deviceLang === 'ar' ? 'ar' : 'fr';

// Autorise le RTL (derja AR). Le vrai basculement de layout impose un
// redémarrage via I18nManager.forceRTL — géré au changement de langue en S1.
I18nManager.allowRTL(true);

void i18n.use(initReactI18next).init({
  resources: {
    fr: { translation: fr },
    ar: { translation: ar },
  },
  lng: initialLang,
  fallbackLng: 'fr',
  interpolation: { escapeValue: false },
});

export default i18n;
