// Tests unitaires de la logique pure (mappers, helpers, données de référence).
// Preset jest-expo = transforms Babel RN/Expo ; alias @/ mappé sur src/.
module.exports = {
  preset: 'jest-expo',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
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
