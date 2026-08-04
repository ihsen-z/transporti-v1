import { Redirect, Stack } from 'expo-router';
import { useAuthStore } from '@/core/auth/authStore';

// Pile de navigation de la zone non authentifiée (login, plus tard : register,
// mot de passe oublié). En-têtes masqués : chaque écran gère son propre chrome.
export default function AuthLayout() {
  const status = useAuthStore((s) => s.status);

  // Garde symétrique de (app)/_layout, qui renvoie vers /login quand la session
  // est absente. Sans ce pendant, la connexion réussit (200 + session ouverte)
  // mais l'écran reste sur /login : app/index.tsx, seul aiguillage vers /home,
  // n'est plus monté dès qu'on a navigué vers la zone auth.
  if (status === 'authenticated') {
    return <Redirect href="/home" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
