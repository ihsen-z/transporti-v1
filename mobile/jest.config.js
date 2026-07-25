// Tests unitaires de la logique pure (mappers, helpers, données de référence).
// Preset jest-expo = transforms Babel RN/Expo ; alias @/ mappé sur src/.
module.exports = {
  preset: 'jest-expo',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
};
