import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Marge basse d'une feuille modale qui monte du bas de l'écran.
 *
 * Depuis Expo SDK 54, l'application cible Android 16, qui impose l'affichage
 * bord à bord : une feuille ancrée en bas s'étend sous la barre de gestes du
 * système. Avec sa seule marge de design, son dernier élément (le bouton
 * d'envoi, la dernière ligne d'une liste) se retrouvait collé contre la barre,
 * vu en recette sur émulateur Android 16 le 25/10/2026.
 *
 * Le fond de la feuille continue jusqu'au bord de l'écran : seule la marge
 * intérieure grandit de la hauteur de la barre. Sur un appareil sans barre de
 * gestes (inset nul), rien ne change.
 */
export function useSheetBottomPadding(designPadding: number): number {
  const { bottom } = useSafeAreaInsets();
  return designPadding + bottom;
}
