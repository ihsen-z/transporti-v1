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
  // Plugin local (`eslint-rules/`, lié en `file:`) : ses règles n'ont de sens
  // que pour ce dépôt, parce qu'elles encodent une exigence de SA charte.
  plugins: ['local'],
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

    // La charte impose « cibles ≥ 44 px » et la constante `TOUCH_TARGET`
    // existe depuis le début — pourtant la recette du 03/09 a mesuré ONZE
    // commandes entre 21 et 43 dp, dont deux actions destructives. Ce n'était
    // pas un défaut de spécification mais une application partielle, et rien
    // ne la signalait. Cette règle la signale.
    //
    // `warn` et non `error` : les deux contrôles sont des heuristiques (un
    // style importé d'ailleurs produit un faux positif). Elle doit faire
    // réfléchir, pas bloquer un correctif urgent.
    'local/pressable-accessible': 'warn',
  },
  overrides: [
    {
      // Les tests ont le droit d'être bavards.
      files: ['**/*.test.ts', '**/*.test.tsx', '**/__tests__/**'],
      rules: { 'no-console': 'off' },
    },
  ],
};
