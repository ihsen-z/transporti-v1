import { Stack } from 'expo-router';

// Pile imbriquée de l'onglet Messages : liste (index) <-> fil (jobId). Chaque
// écran gère son propre chrome (en-têtes masqués), comme le reste de l'app.
// Avant ce fichier, la bascule liste/fil vivait dans un `useState` local à
// messages.tsx : aucune des deux vues n'avait d'URL, donc aucune notification
// ni aucun retour matériel Android n'avait de comportement fiable (4.5/4.6).
export default function MessagesLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
