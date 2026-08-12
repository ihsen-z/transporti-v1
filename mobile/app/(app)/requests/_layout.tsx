import { Stack } from 'expo-router';

// Pile imbriquée de l'onglet Demandes reçues (TRANSPORTEUR) : mes trajets
// (index) <-> demandes reçues sur un trajet (jobId). Symétrique de
// messages/_layout.tsx (4.5).
export default function RequestsLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
