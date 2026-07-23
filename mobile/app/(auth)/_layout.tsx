import { Stack } from 'expo-router';

// Pile de navigation de la zone non authentifiée (login, plus tard : register,
// mot de passe oublié). En-têtes masqués : chaque écran gère son propre chrome.
export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
