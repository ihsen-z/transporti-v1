// Types ambiants d'Expo, référencés explicitement.
//
// Expo les charge d'habitude via `expo-env.d.ts`, mais ce fichier est généré
// par `expo start` et ignoré par git : il existe sur un poste de développement,
// jamais en CI. Or les sources `.tsx` de phosphor-react-native (que le
// tsconfig fait vérifier, voir `paths`) passent `className` à <Svg>, et seule
// l'augmentation `expo/types/react-native-web.d.ts` déclare cette prop. Sans
// cette référence, le typecheck passait en local et échouait en CI.
/// <reference types="expo/types" />
