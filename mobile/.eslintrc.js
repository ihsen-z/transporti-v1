// Configuration ESLint du mobile.
//
// Le projet n'avait AUCUNE config commitée : `npm run lint` appelait
// `expo lint`, qui tente d'installer et de générer une configuration au premier
// lancement — comportement interactif, non reproductible en CI, et règles non
// figées. Rien n'interdisait donc un `console.log` en production, une
// dépendance de hook manquante ou un import inutilisé.
//
// Format « eslintrc » et ESLint 8 assumés : `eslint-config-expo@8`, la version
// alignée sur le SDK Expo 52 utilisé ici, est une config legacy. ESLint 9
// n'accepte plus ce format par défaut, et la migration en config « flat » n'a
// de sens qu'avec la montée de SDK — pas avant.
//
// La base `eslint-config-expo` apporte React, React Hooks, TypeScript et les
// spécificités React Native. On n'ajoute ici que ce qui protège des défauts
// réellement observés dans ce dépôt.
module.exports = {
  root: true,
  extends: ['expo'],
  ignorePatterns: [
    'node_modules/',
    '.expo/',
    'dist/',
    'web-build/',
    'android/',
    'ios/',
    'expo-env.d.ts',
  ],
  rules: {
    // Les imports et variables inutilisés sont du bruit ; le préfixe `_` reste
    // toléré (signatures imposées, déstructurations partielles).
    '@typescript-eslint/no-unused-vars': [
      'warn',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
    ],

    // Un console.log oublié part en production et peut faire fuiter des données
    // de mission dans les logs de l'appareil. warn/error restent autorisés :
    // ce sont eux qui alimentent l'observabilité.
    'no-console': ['warn', { allow: ['warn', 'error'] }],
  },
  overrides: [
    {
      // Les tests ont le droit d'être bavards.
      files: ['**/*.test.ts', '**/*.test.tsx', '**/__tests__/**'],
      rules: { 'no-console': 'off' },
    },
  ],
};
