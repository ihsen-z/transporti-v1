// Tests unitaires de la logique pure (mappers, helpers, données de référence).
// Preset jest-expo = transforms Babel RN/Expo ; alias @/ mappé sur src/.
module.exports = {
  preset: 'jest-expo',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',

    // Annule, pour Jest, la redirection de types posee dans tsconfig.json.
    //
    // Cette redirection fait lire a TypeScript les SOURCES .tsx de Phosphor
    // (le paquet ne livre pas de .d.ts a cote de son JS compile). Mais
    // jest-expo reprend les `paths` du tsconfig dans son moduleNameMapper :
    // Jest se mettait donc a charger ces .tsx depuis node_modules, qu'il
    // n'est pas configure pour transformer — « Cannot use import statement
    // outside a module ».
    //
    // On le ramene sur le JS compile, celui-la meme que Metro embarque. Les
    // tests executent alors exactement ce que l'application execute.
    '^phosphor-react-native/lib/commonjs/icons/(.*)$':
      '<rootDir>/node_modules/phosphor-react-native/lib/commonjs/icons/$1',
  },
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],


  // Périmètre de couverture. Les écrans de route (app/) sont volontairement
  // exclus : ils ne font que composer, et aucun outillage de test de composant
  // n'est encore installé — les compter ferait afficher un chiffre trompeur.
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.test.{ts,tsx}',
    '!src/**/index.ts',
    '!src/core/i18n/locales/**',
  ],
  coverageReporters: ['text-summary', 'lcov'],

  // Pas de seuil global : la couverture actuelle porte sur la logique pure et
  // un seuil chiffré maintenant récompenserait le mauvais code (des tests
  // faciles plutôt que les tests utiles). Le seuil sera posé avec les tests de
  // src/core/api/client.ts, qui est la partie réellement critique.
};
