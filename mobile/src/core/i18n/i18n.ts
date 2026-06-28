import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import { I18nManager } from 'react-native';

import frCommon from './locales/fr/common.json';
import frAuth from './locales/fr/auth.json';
import arCommon from './locales/ar/common.json';
import arAuth from './locales/ar/auth.json';

const resources = {
  fr: {
    common: frCommon,
    auth: frAuth,
  },
  ar: {
    common: arCommon,
    auth: arAuth,
  },
};

const systemLocales = Localization.getLocales();
const systemLanguage = systemLocales && systemLocales.length > 0 ? systemLocales[0].languageCode : 'fr';
const defaultLanguage = systemLanguage === 'ar' || systemLanguage === 'fr' ? systemLanguage : 'fr';

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: defaultLanguage || 'fr',
    fallbackLng: 'fr',
    ns: ['common', 'auth'],
    defaultNS: 'common',
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });

const isRTL = defaultLanguage === 'ar';
if (I18nManager.isRTL !== isRTL) {
  I18nManager.forceRTL(isRTL);
}

export default i18n;
